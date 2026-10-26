# Verificación de recursos con AWS CLI en Terraform y LocalStack

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

Crear un recurso y comprobarlo son actividades diferentes.
Terraform informa sobre las operaciones realizadas y conserva relaciones en su estado.
AWS CLI (vía `aws_local`) permite consultar la API para observar los recursos y sus propiedades.
La combinación de ambas herramientas ayuda a identificar errores y limitar las conclusiones.

Esta lección desarrolla un procedimiento de verificación reproducible.
Comprobaremos existencia, etiquetas y contenido de un bucket S3.
Después automatizaremos algunas comprobaciones con Bash y `jq`.
Las ampliaciones introducirán SQS y DynamoDB cuando el entorno las admita.

El objetivo es obtener evidencias claras, no acumular comandos.
Cada comprobación tendrá un alcance, un criterio de aceptación y una interpretación.
También distinguiremos consultas de lectura y operaciones que modifican recursos.

---

## 1. Objetivos de aprendizaje

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Diferenciar configuración, estado y respuesta de la API.
- Explicar qué demuestra una consulta de existencia.
- Distinguir presencia de un recurso y corrección de sus propiedades.
- Reconocer límites de listados y consultas filtradas.
- Interpretar resultados sin inventar causas.

### 1.2. Objetivos prácticos

También podrás:

- Consultar recursos locales mediante `aws_local`.
- Comparar etiquetas con valores esperados.
- Descargar y comprobar contenido.
- Automatizar verificaciones pequeñas.
- Documentar fallos y limpiar el laboratorio.

---

## 2. Alcance de la documentación

### 2.1. Servicios utilizados

Trabajaremos principalmente con S3.
STS aparecerá como endpoint auxiliar del provider.
SQS y DynamoDB serán ampliaciones opcionales.
No se ejecutarán ampliaciones sin comprobar su disponibilidad.

### 2.2. Herramientas utilizadas

Necesitarás:

- Terraform CLI (>= 1.6, < 2.0).
- Provider de AWS (~> 5.0).
- Docker Compose.
- LocalStack (3.7.0).
- AWS CLI versión 2.
- Bash y `jq`.

### 2.3. Exclusiones

No comprobaremos recursos de producción ni utilizaremos credenciales reales.
La verificación local no certificará seguridad, rendimiento o disponibilidad de AWS.

---

## 3. Requisitos previos

### 3.1. Comprobación de ejecutables

```bash
terraform version
docker version
docker compose version
aws --version
jq --version
```

### 3.2. Interpretación

Docker debe mostrar un servidor disponible.
AWS CLI debe corresponder a la versión 2.
`jq` debe estar instalado para las comprobaciones automatizadas.
Resuelve instalación y permisos antes de continuar.

### 3.3. Conocimientos necesarios

Debes saber editar archivos HCL y ejecutar comandos Bash.
También debes distinguir el directorio del proyecto y el contexto de Docker.
La lección anterior proporciona el ciclo básico de despliegue.

---

## 4. Versiones y reproducibilidad

### 4.1. Base didáctica

Utilizaremos Terraform desde 1.6 y anterior a 2.0.
El provider de AWS se limitará a la serie 5.
LocalStack utilizará una imagen concreta proporcionada por el docente (ej. 3.7.0).
Estas elecciones no representan una lista de versiones actuales.

### 4.2. Información que debes registrar

Conserva:

- Terraform CLI y provider efectivo.
- Docker y Docker Compose.
- AWS CLI y `jq`.
- Imagen y modalidad de LocalStack.
- Sistema operativo y arquitectura.
- Fecha de ejecución.

### 4.3. Regla

El docente debe probar la combinación antes de impartir la sesión.
Esta página no afirma haber ejecutado los comandos en tu equipo.

---

## 5. Qué significa verificar un recurso

Verificar consiste en contrastar una expectativa con una observación definida.

### 5.1. Ejemplo sencillo

Expectativa:
> Existe el bucket creado por este proyecto.

Observación:
> `head-bucket` termina correctamente para el nombre esperado.

La conclusión debe mantenerse dentro de ese alcance.

### 5.2. Tres fuentes de verdad

| Fuente | Qué muestra | Limitación |
|--------|-------------|------------|
| **Configuración** (`.tf`) | Intención declarada | No prueba existencia real |
| **Estado** (`terraform.tfstate`) | Lo que Terraform gestiona | Puede estar desactualizado (drift) |
| **API** (`aws_local`) | Lo que existe realmente | No sabe qué gestiona Terraform |

> **Regla**: La verificación independiente usa la API (`aws_local`), no el estado.

---

## 6. Configuración del laboratorio

### 6.1. Arquitectura

```
Terraform (gestión)          aws_local (verificación)
     │                              │
     ▼                              ▼
http://127.0.0.1:4566 (LocalStack S3)
```

### 6.2. `compose.yaml`

```yaml
services:
  localstack:
    image: localstack/localstack:3.7.0
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: s3,sts,sqs,dynamodb
      AWS_DEFAULT_REGION: us-east-1
    volumes:
      - localstack_data:/var/lib/localstack

volumes:
  localstack_data:
```

### 6.3. `aws_local`

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

### 6.4. Recursos Terraform base

```hcl
# main.tf
resource "aws_s3_bucket" "verificacion" {
  bucket = "tf-aula-verificacion-001"
  tags = {
    Curso   = "Terraform"
    Entorno = "LocalStack"
    Leccion = "Verificacion"
    Version = "1.0"
  }
}

resource "aws_s3_object" "documento" {
  bucket = aws_s3_bucket.verificacion.bucket
  key    = "docs/archivo.txt"
  content = "Contenido verificado por aws_local"
  content_type = "text/plain"
}

# outputs.tf
output "bucket_name" { value = aws_s3_bucket.verificacion.bucket }
output "bucket_arn"  { value = aws_s3_bucket.verificacion.arn }
```

---

## 7. Práctica guiada paso a paso

### Paso 1: Preparar y desplegar

```bash
mkdir -p verificacion/evidencias
cd verificacion

docker compose up -d
curl -s http://127.0.0.1:4566/_localstack/health | jq .
source .env.localstack

# Desplegar recursos Terraform
terraform init
terraform fmt
terraform validate
terraform plan -out=deploy.tfplan
terraform apply deploy.tfplan
```

### Paso 2: Verificación de existencia

```bash
# Desde Terraform (estado)
terraform output bucket_name
terraform state list

# Desde API (independiente) - CRITERIO PRIMARIO
aws_local s3api list-buckets | jq -r '.Buckets[].Name'
aws_local s3api head-bucket --bucket tf-aula-verificacion-001
echo "Exit code: $?"  # 0 = existe
```

### Paso 3: Verificación de etiquetas

```bash
# Expectativa: tags del main.tf
# Observación: API
aws_local s3api get-bucket-tagging --bucket tf-aula-verificacion-001 | jq '.TagSet'

# Comparación automatizada
EXPECTED_TAGS='{"Curso":"Terraform","Entorno":"LocalStack","Leccion":"Verificacion","Version":"1.0"}'
ACTUAL_TAGS=$(aws_local s3api get-bucket-tagging --bucket tf-aula-verificacion-001 | jq -c '.TagSet | from_entries')

if [ "$EXPECTED_TAGS" = "$ACTUAL_TAGS" ]; then
  echo "✅ Tags coinciden"
else
  echo "❌ Tags difieren"
  echo "Esperado: $EXPECTED_TAGS"
  echo "Actual:   $ACTUAL_TAGS"
fi
```

### Paso 4: Verificación de objeto y contenido

```bash
# Existencia
aws_local s3api head-object --bucket tf-aula-verificacion-001 --key docs/archivo.txt

# Contenido
aws_local s3api get-object \
  --bucket tf-aula-verificacion-001 \
  --key docs/archivo.txt \
  /tmp/archivo-verificado.txt

# Comparación
EXPECTED="Contenido verificado por aws_local"
ACTUAL=$(cat /tmp/archivo-verificado.txt)

if [ "$EXPECTED" = "$ACTUAL" ]; then
  echo "✅ Contenido coincide"
else
  echo "❌ Contenido difiere"
  echo "Esperado: $EXPECTED"
  echo "Actual:   $ACTUAL"
fi
```

### Paso 5: Verificación de atributos del objeto

```bash
aws_local s3api head-object \
  --bucket tf-aula-verificacion-001 \
  --key docs/archivo.txt | jq '{ContentType, ContentLength, ETag, LastModified}'
```

### Paso 6: Ampliación - Verificación SQS (opcional)

```hcl
# Añadir a main.tf
resource "aws_sqs_queue" "test" {
  name = "tf-aula-verificacion-001"
}

output "queue_url" { value = aws_sqs_queue.test.id }
```

```bash
terraform plan -out=sqs.tfplan
terraform apply sqs.tfplan

# Verificar
aws_local sqs get-queue-url --queue-name tf-aula-verificacion-001
aws_local sqs get-queue-attributes --queue-url $(terraform output -raw queue_url) --attribute-names All
```

### Paso 7: Ampliación - Verificación DynamoDB (opcional)

```hcl
# Añadir a main.tf
resource "aws_dynamodb_table" "test" {
  name           = "tf-aula-verificacion-001"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"
  attribute { name = "id", type = "S" }
}

output "table_name" { value = aws_dynamodb_table.test.name }
```

```bash
terraform plan -out=ddb.tfplan
terraform apply ddb.tfplan

# Verificar
aws_local dynamodb describe-table --table-name tf-aula-verificacion-001
aws_local dynamodb put-item --table-name tf-aula-verificacion-001 --item '{"id":{"S":"test-1"},"data":{"S":"verificado"}}'
aws_local dynamodb get-item --table-name tf-aula-verificacion-001 --key '{"id":{"S":"test-1"}}'
```

### Paso 8: Script de verificación automatizada

```bash
# verify.sh
#\!/bin/bash
set -euo pipefail

BUCKET="tf-aula-verificacion-001"
PASS=0
FAIL=0

check() {
  local desc="$1"
  local cmd="$2"
  if eval "$cmd" >/dev/null 2>&1; then
    echo "✅ $desc"
    ((PASS++))
  else
    echo "❌ $desc"
    ((FAIL++))
  fi
}

echo "=== Verificación de recursos ==="

# Bucket existe
check "Bucket existe" "aws_local s3api head-bucket --bucket $BUCKET"

# Tags correctos
check "Tags correctos" "aws_local s3api get-bucket-tagging --bucket $BUCKET | jq -e '.TagSet | from_entries | .Curso==\"Terraform\" and .Entorno==\"LocalStack\"'"

# Objeto existe
check "Objeto existe" "aws_local s3api head-object --bucket $BUCKET --key docs/archivo.txt"

# Contenido correcto
check "Contenido correcto" "[ \"$(aws_local s3api get-object --bucket $BUCKET --key docs/archivo.txt /dev/stdout)\" = \"Contenido verificado por aws_local\" ]"

echo "=== Resumen: $PASS passed, $FAIL failed ==="
exit $FAIL
```

```bash
chmod +x verify.sh
./verify.sh
```

### Paso 9: Limpiar

```bash
terraform plan -destroy -out=destroy.tfplan
terraform apply destroy.tfplan

aws_local s3api list-buckets
aws_local sqs list-queues
aws_local dynamodb list-tables

docker compose down
```

---

## 8. Sesiones guiadas para el alumnado

### 8.1. Sesión 1: Verificación básica (25 min)

1. Desplegar bucket + objeto con Terraform
2. Verificar existencia: `list-buckets`, `head-bucket`, `head-object`
3. Verificar etiquetas: `get-bucket-tagging` + comparación con `jq`
4. Verificar contenido: `get-object` + `diff`
5. **Entrega**: Evidencias de cada verificación + criterio de aceptación

### 8.2. Sesión 2: Automatización y ampliaciones (30 min)

1. Escribir script `verify.sh` con comprobaciones automatizadas
2. Ejecutar y documentar resultados
3. (Opcional) Añadir SQS y DynamoDB, verificar con `aws_local`
4. **Entrega**: Script `verify.sh` + salida + ampliaciones

### 8.3. Sesión 3: Drift y límites (20 min)

1. Modificar etiqueta vía `aws_local` (drift externo)
2. `terraform plan` → detecta drift
3. Discutir: ¿qué detecta Terraform? ¿qué no?
4. Limpiar todo
5. **Entrega**: Evidencia drift + análisis de límites

---

## 9. Ejercicios de refuerzo

### 9.1. Ejercicio de identificación

Explica:
- Por qué `terraform output` no es verificación de API
- Qué demuestra `head-bucket` exit code 0 vs 254
- Diferencia entre `list-buckets` y `head-bucket`

### 9.2. Ejercicio de interpretación

Un compañero ejecuta `terraform apply` y ve "Apply complete\!".
Luego ejecuta `aws_local s3api list-buckets` y el bucket NO aparece.
¿Qué pudo pasar? Enumera 3 hipótesis y cómo verificarlas.

### 9.3. Ejercicio con asistente de IA

```text
Instrucción:
Genera un script de verificación para un bucket S3 con:
- Nombre específico
- Tags esperados (mínimo 3)
- Un objeto con contenido conocido
El script debe: usar aws_local, jq, códigos de salida, resumen final.
No uses Terraform en el script. Solo aws_local.
```

---

## 10. Limitaciones de la verificación en LocalStack

| Verificación | LocalStack | AWS Real |
|--------------|------------|----------|
| Existencia bucket | ✅ | ✅ |
| Etiquetas | ✅ | ✅ |
| Contenido objeto | ✅ | ✅ |
| Políticas IAM | ⚠️ Simplificado | ✅ Estricto |
| Cifrado (SSE) | ⚠️ Simulado | ✅ Real |
| Versionado | ⚠️ Básico | ✅ Completo |
| Replicación | ❌ | ✅ |
| Métricas/CloudWatch | ❌ | ✅ |

---

## 11. Diagnóstico de errores frecuentes

| Síntoma | Qué comprobar | Qué evitar |
|---------|---------------|------------|
| `head-bucket` exit 254 | Nombre correcto, bucket existe | Asumir existencia sin verificar |
| Tags vacíos | `get-bucket-tagging` error 404 | Asumir tags por defecto |
| Contenido difiere | Encoding, newlines, `diff -u` | Comparar strings sin normalizar |
| `jq` error parsing | JSON válido, `jq -e` para exit code | Asumir estructura fija |
| SQS/DynamoDB no responde | Endpoint en provider, SERVICES en compose | Asumir que hereda de S3 |

---

## 12. Evaluación y cierre

### 12.1. Rúbrica (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Existencia | No verifica | Solo `list-buckets` | `head-bucket` + `head-object` + exit codes |
| Etiquetas | No compara | Compara manual | Automatizada con `jq` + criterio |
| Contenido | No descarga | Descarga sin comparar | Descarga + `diff` + automatizado |
| Automatización | Sin script | Script básico | Script robusto + resumen + exit code |
| Ampliaciones | Solo S3 | S3 + 1 servicio | S3 + SQS + DynamoDB (si disponible) |

### 12.2. Checklist final

- [ ] Bucket verificado con `head-bucket` (exit code 0)
- [ ] Etiquetas comparadas automatizadamente con `jq`
- [ ] Objeto descargado y contenido verificado con `diff`
- [ ] Script `verify.sh` funcional con resumen pass/fail
- [ ] Drift introducido y detectado con `terraform plan`
- [ ] Limpieza completa: destroy + list-buckets/queues/tables vacío
- [ ] `docker compose down`

### 12.3. Idea principal

> **Terraform dice lo que GESTIONA; aws_local dice lo que EXISTE.**
> Verificar es contrastar expectativa vs observación en la API.
> **Automatiza la verificación. Documenta el alcance. Acepta los límites.**
