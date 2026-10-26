# Dependencias implícitas y explícitas en Terraform

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

Terraform construye un grafo de dependencias para determinar el orden de creación, actualización y destrucción de recursos.
Las dependencias implícitas surgen de referencias entre recursos.
Las dependencias explícitas (`depends_on`) se declaran cuando Terraform no puede inferir la relación.
Esta lección enseña a identificar, visualizar y gestionar ambos tipos.

---

## 1. Objetivos de aprendizaje

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Explicar cómo Terraform infiere dependencias de referencias.
- Diferenciar dependencia implícita vs explícita.
- Entender el grafo de dependencias y su visualización.
- Identificar cuándo `depends_on` es necesario vs redundante.

### 1.2. Objetivos prácticos

También podrás:

- Crear recursos con dependencias implícitas (referencias).
- Añadir `depends_on` para dependencias lógicas no referenciadas.
- Visualizar el grafo con `terraform graph`.
- Diagnosticar errores de orden (ciclos, dependencias faltantes).

---

## 2. Requisitos previos

```bash
terraform version
docker version
docker compose version
aws --version
graphviz --version  # opcional, para visualizar grafos
```

Conocimientos: ciclo básico (04-01), recursos, outputs, referencias.

---

## 3. Configuración del laboratorio

### 3.1. Arquitectura

```
Terraform (dependencias)           aws_local (verificación)
     │                                  │
     ▼                                  ▼
http://127.0.0.1:4566 (LocalStack S3, SQS)
```

### 3.2. `compose.yaml`

```yaml
services:
  localstack:
    image: localstack/localstack:3.7.0
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: s3,sts,sqs
      AWS_DEFAULT_REGION: us-east-1
    volumes:
      - localstack_data:/var/lib/localstack

volumes:
  localstack_data:
```

### 3.3. `aws_local`

```bash
aws_local() {
  AWS_ACCESS_KEY_ID=test \
  AWS_SECRET_ACCESS_KEY=test \
  AWS_SESSION_TOKEN= \
  AWS_CONFIG_FILE=/dev/null \
  AWS_SHARED_CREDENTIALS_FILE=/dev/null \
  AWS_EC2_METADATA_DISABLED=true \
  aws \
    --endpoint-url http://127.0.0.1:4566 \
    --region us-east-1 \
    --no-cli-pager \
    "$@"
}
```

---

## 4. Dependencias implícitas

### 4.1. Mecanismo

Terraform analiza las expresiones en los bloques `resource`, `data`, `module`, `output`.
Si un recurso referencia un atributo de otro (`aws_s3_bucket.demo.bucket`), crea una dependencia implícita.
El recurso referenciado se crea/actualiza **antes** del que lo referencia.

### 4.2. Ejemplos de referencias que crean dependencia

```hcl
resource "aws_s3_bucket" "demo" {
  bucket = "tf-deps-001"
}

resource "aws_s3_object" "doc" {
  bucket = aws_s3_bucket.demo.bucket  # ← Dependencia implícita en bucket
  key    = "archivo.txt"
  content = "Hola"
}

resource "aws_sqs_queue" "eventos" {
  name = "tf-eventos"
}

resource "aws_sqs_queue_policy" "policy" {
  queue_url = aws_sqs_queue.eventos.id  # ← Dependencia implícita
  policy = jsonencode({...})
}
```

### 4.3. Tipos de referencias

| Referencia | Crea dependencia |
|------------|------------------|
| `aws_s3_bucket.demo.bucket` | ✅ Sí |
| `aws_s3_bucket.demo.arn` | ✅ Sí |
| `aws_s3_bucket.demo.id` | ✅ Sí |
| `var.bucket_name` (variable) | ❌ No (valor conocido en plan) |
| `local.prefix` (local) | ❌ No (valor conocido en plan) |
| `data.aws_s3_bucket.existente.bucket` | ✅ Sí (data source) |
| `module.bucket.bucket_name` (output módulo) | ✅ Sí |

---

## 5. Dependencias explícitas (`depends_on`)

### 5.1. Cuándo usar

`depends_on` fuerza una dependencia que Terraform **no puede inferir** porque no hay referencia de atributo.
Casos típicos:
- Recurso A debe existir antes que B, pero B no referencia atributos de A.
- Orden lógico: IAM role antes que Lambda que lo usa (aunque Lambda referencia ARN, a veces hace falta).
- Recurso que prepara estado externo (ej. script de inicialización).
- `null_resource` con provisioners (legacy).

### 5.2. Sintaxis

```hcl
resource "aws_s3_bucket" "logs" {
  bucket = "tf-logs-001"
}

resource "aws_s3_bucket" "data" {
  bucket = "tf-data-001"
  depends_on = [aws_s3_bucket.logs]  # Fuerza: logs antes que data
}
```

### 5.3. `depends_on` con módulos

```hcl
module "network" { source = "./modules/network" }
module "compute" {
  source = "./modules/compute"
  depends_on = [module.network]  # Red antes que compute
}
```

### 5.4. Redundancia

Si YA hay referencia de atributo, `depends_on` es **redundante** (no daña pero ensucia).

```hcl
# REDUNDANTE: bucket ya referencia queue_url
resource "aws_sqs_queue" "q" { name = "q" }
resource "aws_lambda_function" "f" {
  # ...
  environment { variables = { QUEUE_URL = aws_sqs_queue.q.id } }
  depends_on = [aws_sqs_queue.q]  # ← Innecesario
}
```

---

## 6. Grafo de dependencias

### 6.1. `terraform graph`

Genera salida en formato DOT (Graphviz).

```bash
terraform graph | dot -Tpng > graph.png
terraform graph -type=plan | dot -Tpng > plan-graph.png
terraform graph -type=apply | dot -Tpng > apply-graph.png
terraform graph -draw-cycles | dot -Tpng > cycles.png
```

### 6.2. Tipos de grafo

| Tipo | Qué muestra |
|------|-------------|
| `plan` (default) | Dependencias de configuración |
| `apply` | Dependencias durante apply (incluye datos known after apply) |
| `validate` | Solo validación sintáctica |
| `input` | Variables requeridas |
| `refresh` | Solo refresh de estado |

### 6.3. Visualización sin Graphviz (texto)

```bash
terraform graph | grep -E 'aws_s3_bucket|aws_sqs_queue' | head -20
```

---

## 7. Ciclos de dependencia

### 7.1. Qué son

Un ciclo ocurre cuando A depende de B y B depende de A (directa o indirectamente).
Terraform **rechaza** configuraciones con ciclos.

### 7.2. Ejemplo de ciclo

```hcl
resource "aws_s3_bucket" "a" {
  bucket = "a"
  # Referencia circular via lifecycle
  lifecycle {
    ignore_changes = [aws_s3_bucket.b.bucket]  # ¡Ciclo\!
  }
}

resource "aws_s3_bucket" "b" {
  bucket = "b"
  lifecycle {
    ignore_changes = [aws_s3_bucket.a.bucket]  # ¡Ciclo\!
  }
}
```

### 7.3. Detectar y resolver

```bash
terraform validate
# Error: Cycle: aws_s3_bucket.a -> aws_s3_bucket.b -> aws_s3_bucket.a

terraform graph -draw-cycles | dot -Tpng > cycles.png
```

**Resolución**: Eliminar referencia circular, usar `depends_on` unidireccional, o reestructurar.

---

## 8. Práctica guiada

### Paso 1: Preparar

```bash
mkdir -p dependencias/evidencias
cd dependencias
docker compose up -d
source .env.localstack
```

### Paso 2: Configuración con dependencias implícitas

```hcl
# versions.tf, providers.tf (estándar + sqs endpoint)

# variables.tf
variable "project" { type = string, default = "deps-demo" }

# locals.tf
locals {
  prefix = var.project
  tags = { Leccion = "Dependencias" }
}

# main.tf
resource "aws_s3_bucket" "origen" {
  bucket = "${local.prefix}-origen"
  tags = local.tags
}

resource "aws_s3_object" "documento" {
  bucket = aws_s3_bucket.origen.bucket  # Implícita
  key    = "datos/entrada.csv"
  content = "id,valor\n1,100\n2,200"
}

resource "aws_sqs_queue" "procesamiento" {
  name = "${local.prefix}-procesamiento"
}

resource "aws_sqs_queue_policy" "policy" {
  queue_url = aws_sqs_queue.procesamiento.id  # Implícita
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = "*"
      Action = "sqs:SendMessage"
      Resource = aws_sqs_queue.procesamiento.arn
      Condition = {
        ArnEquals = { "aws:SourceArn" = aws_s3_bucket.origen.arn }
      }
    }]
  })
}

# outputs.tf
output "bucket_name" { value = aws_s3_bucket.origen.bucket }
output "queue_url"   { value = aws_sqs_queue.procesamiento.id }
```

### Paso 3: Visualizar grafo implícito

```bash
terraform init
terraform fmt
terraform validate

# Grafo de configuración
terraform graph > graph.dot
# Si tienes graphviz: dot -Tpng graph.dot > graph.png

# Ver dependencias en texto
terraform graph | grep -E 'aws_s3_bucket|aws_s3_object|aws_sqs_queue'
```

### Paso 4: Desplegar y verificar orden

```bash
terraform plan -out=deps.tfplan
terraform show deps.tfplan
# Observar orden: origen → documento, origen → policy, procesamiento → policy

terraform apply deps.tfplan

# Verificar
aws_local s3api head-bucket --bucket deps-demo-origen
aws_local s3api get-object --bucket deps-demo-origen --key datos/entrada.csv /tmp/entrada.csv
aws_local sqs get-queue-attributes --queue-url $(terraform output -raw queue_url) --attribute-names All
```

### Paso 5: Añadir dependencia explícita

```hcl
# Nuevo bucket que debe crearse DESPUÉS de 'origen' pero SIN referenciarlo
resource "aws_s3_bucket" "backup" {
  bucket = "${local.prefix}-backup"
  tags = local.tags
  depends_on = [aws_s3_bucket.origen]  # Explícita: orden lógico
}
```

### Paso 6: Verificar grafo con explícita

```bash
terraform plan -out=deps2.tfplan
terraform show deps2.tfplan
# Verificar: backup depende de origen

terraform graph | grep -A2 -B2 backup
terraform apply deps2.tfplan
```

### Paso 7: Intentar ciclo (y resolver)

```hcl
# COMENTAR O ELIMINAR TRAS PROBAR - crea ciclo
# resource "aws_s3_bucket" "ciclo_a" {
#   bucket = "ciclo-a"
#   lifecycle { ignore_changes = [aws_s3_bucket.ciclo_b.bucket] }
# }
# resource "aws_s3_bucket" "ciclo_b" {
#   bucket = "ciclo-b"
#   lifecycle { ignore_changes = [aws_s3_bucket.ciclo_a.bucket] }
# }
```

```bash
# terraform validate  # Debe fallar con error de ciclo
# terraform graph -draw-cycles > cycles.dot
```

### Paso 8: Limpiar

```bash
terraform destroy -auto-approve
aws_local s3api list-buckets
aws_local sqs list-queues
docker compose down
```

---

## 9. Sesiones guiadas

### 9.1. Sesión 1: Dependencias implícitas (25 min)

1. Crear recursos con referencias (bucket → object, queue → policy)
2. `terraform graph` → visualizar dependencias
3. `plan` → verificar orden de creación
4. **Entrega**: Grafo (imagen o texto) + explicación de 3 dependencias

### 9.2. Sesión 2: Dependencias explícitas (25 min)

1. Añadir recurso sin referencia pero con orden lógico (`depends_on`)
2. Comparar grafo antes/después
3. Verificar que `depends_on` redundante no cambia grafo
4. **Entrega**: Comparativa grafo + justificación `depends_on`

### 9.3. Sesión 3: Ciclos y diagnóstico (20 min)

1. Crear ciclo intencional → `validate` falla
2. `graph -draw-cycles` → visualizar
3. Resolver eliminando referencia circular
4. **Entrega**: Error ciclo + grafo ciclos + solución

---

## 10. Ejercicios de refuerzo

### 10.1. Ejercicio de identificación

Para cada par, ¿hay dependencia implícita?

1. `aws_s3_bucket.a` → `aws_s3_object.o` (bucket = aws_s3_bucket.a.bucket)
2. `aws_sqs_queue.q` → `aws_lambda_function.f` (environment.QUEUE_URL = aws_sqs_queue.q.id)
3. `aws_iam_role.r` → `aws_lambda_function.f` (role = aws_iam_role.r.arn)
4. `variable "x"` → `resource "aws_s3_bucket" "b"` (bucket = var.x)
5. `local.y` → `resource "aws_s3_bucket" "b"` (bucket = local.y)

### 10.2. Ejercicio de interpretación

Dado:
```hcl
resource "aws_s3_bucket" "a" { bucket = "a" }
resource "aws_s3_bucket" "b" { bucket = "b", depends_on = [aws_s3_bucket.a] }
resource "aws_s3_bucket" "c" { bucket = "c" }
resource "aws_s3_object" "o" { bucket = aws_s3_bucket.c.bucket }
```
Orden de creación: ¿a, b, c, o? ¿Por qué?

### 10.3. Ejercicio con asistente de IA

```text
Instrucción:
Genera una configuración con 4 recursos que formen una cadena de dependencias:
A → B → C → D (A antes que B, B antes que C, C antes que D).
Usa: S3 bucket, SQS queue, Lambda function, S3 object.
Incluye: referencias implícitas donde sea posible, depends_on donde sea necesario.
No crees ciclos.
```

---

## 11. Limitaciones LocalStack

| Característica | LocalStack | AWS Real |
|----------------|------------|----------|
| Dependencias implícitas | ✅ Idéntico | ✅ |
| `depends_on` | ✅ Idéntico | ✅ |
| `terraform graph` | ✅ Idéntico | ✅ |
| Detección ciclos | ✅ Idéntico | ✅ |

---

## 12. Diagnóstico de errores

| Error | Causa | Solución |
|-------|-------|----------|
| `Cycle detected` | Referencia circular | `graph -draw-cycles`, romper ciclo |
| `Resource not found` en referencia | Recurso no existe aún | Verificar dependencia implícita/explícita |
| `depends_on` no funciona | Sintaxis incorrecta | `depends_on = [resource.tipo.nombre]` |
| Orden incorrecto en apply | Falta dependencia | Añadir referencia o `depends_on` |

---

## 13. Evaluación y cierre

### 13.1. Rúbrica (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Implícitas | No identifica | Identifica básicas | Identifica todas + explica mecanismo |
| Explícitas | No usa | Usa redundante | Usa necesaria + justifica |
| Grafo | No visualiza | Genera DOT | Visualiza + explica orden |
| Ciclos | No detecta | Detecta | Detecta + visualiza + resuelve |

### 13.2. Checklist final

- [ ] Recursos con referencias implícitas (bucket→object, queue→policy)
- [ ] `terraform graph` generado y analizado
- [ ] `depends_on` usado para orden lógico sin referencia
- [ ] `depends_on` redundante identificado y eliminado
- [ ] Ciclo creado intencionalmente, detectado, resuelto
- [ ] Orden de creación verificado en apply
- [ ] Limpieza completa

### 13.3. Idea principal

> **Terraform es un grafo, no una lista.**
> Referencias = aristas implícitas. `depends_on` = aristas explícitas.
> **Si referencias un atributo, ya tienes la dependencia. `depends_on` solo para lo que no se referencia.**
> **Ciclos = error. `terraform graph -draw-cycles` te salva.**
