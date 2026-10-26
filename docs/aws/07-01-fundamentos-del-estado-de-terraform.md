# Fundamentos del estado de Terraform con LocalStack

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

Terraform necesita relacionar los recursos declarados en los archivos de configuración con los objetos que administra.
Esa relación se conserva en el **estado** (state), habitualmente llamado `terraform.tfstate`.
El estado permite identificar recursos, comparar cambios y mantener información necesaria para futuras operaciones.
Sin embargo, no sustituye a la configuración ni representa una copia completa de los servicios administrados.

En esta lección construirás un laboratorio con colas SQS para observar el estado de forma controlada.
Después practicarás inspección, detección de cambios externos (drift), renombrado de recursos, importación y recuperación.
LocalStack permitirá ejecutar las operaciones contra una emulación local de AWS.
La práctica se centra en comprender qué cambia en la configuración, qué cambia en el estado y qué cambia en el servicio.

---

## 1. Objetivos de aprendizaje

### 1.1. Qué aprenderás

Al finalizar podrás:

- Explicar para qué sirve el estado.
- Diferenciar configuración, estado y recursos reales.
- Inspeccionar recursos administrados.
- Crear copias controladas del estado.
- Detectar modificaciones externas (drift).
- Interpretar un plan de actualización del estado.
- Renombrar direcciones sin recrear recursos (`moved`).
- Desvincular e importar recursos existentes.
- Reconocer riesgos de concurrencia y pérdida del estado.

### 1.2. Resultado práctico

Administrarás dos colas SQS y comprobarás cómo cambia su relación con Terraform.

---

## 2. Requisitos previos

```bash
terraform version
docker version
docker compose version
aws --version
jq --version
python3 --version
```

Conocimientos: recursos, variables, outputs, referencias, planes guardados.
Los comandos utilizan Bash y se ejecutan desde el host.

---

## 3. Configuración del laboratorio

### 3.1. Arquitectura

```
Terraform (estado)               aws_local (observación)
     │                                  │
     ▼                                  ▼
http://127.0.0.1:4566 (LocalStack SQS)
```

### 3.2. `compose.yaml`

```yaml
services:
  localstack:
    image: localstack/localstack:3.7.0
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: sqs,sts
      AWS_DEFAULT_REGION: us-east-1
      DEBUG: "1"
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

## 4. Qué es el estado y por qué existe

### 4.1. Tres representaciones de la infraestructura

| Representación | Dónde está | Qué expresa |
|----------------|------------|-------------|
| **Configuración** | Archivos `.tf` | Intención declarada |
| **Estado** | Backend (local: `terraform.tfstate`) | Relaciones y atributos registrados |
| **Recursos reales** | API del servicio (LocalStack) | Objetos existentes y sus propiedades |

En esta práctica, los recursos reales del laboratorio existen en LocalStack.

### 4.2. Diferencia fundamental

> **Editar un archivo no modifica inmediatamente el servicio.**

### 4.3. Operación declarativa

Terraform usa configuración, estado y consultas al proveedor para preparar un plan.

### 4.4. Regla de oro

> **No confundas la intención declarada con la última información registrada ni con la situación actual del servicio.**

---

## 5. Qué conserva el estado

### 5.1. Información habitual

- Direcciones Terraform (`aws_sqs_queue.principal`)
- Identificadores del proveedor (URL, ARN de la cola)
- Atributos de recursos (nombre, atributos, tags)
- Outputs
- Dependencias implícitas y explícitas
- Metadatos: versión Terraform, versión provider, serial, lineage

### 5.2. Qué NO está en el estado

- Recursos no gestionados por esta configuración
- Historial completo de cambios (solo estado actual)
- Secretos en texto plano (aunque `sensitive` no cifra en estado)
- Configuración de proveedores (está en `.tf`)

---

## 6. Backend local vs remoto

### 6.1. Backend local (default)

- Archivo `terraform.tfstate` en directorio de trabajo.
- Adecuado para aprendizaje, desarrollo individual.
- **Riesgo**: pérdida, corrupción, conflictos de concurrencia.

### 6.2. Backend remoto (S3 + DynamoDB)

- Estado en bucket S3 con versionado.
- Bloqueo (locking) via DynamoDB.
- Equipo, CI/CD, producción.
- Ver módulo 07-05.

---

## 7. Práctica guiada paso a paso

### Paso 1: Preparar

```bash
mkdir -p estado-terraform/evidencias
cd estado-terraform
docker compose up -d
curl -s http://127.0.0.1:4566/_localstack/health | jq .
source .env.localstack
```

### Paso 2: Configuración base

```hcl
# versions.tf, providers.tf (estándar + sqs endpoint)

# variables.tf
variable "project" { type = string, default = "estado-demo" }

# locals.tf
locals {
  prefix = var.project
  tags = { Leccion = "EstadoTerraform" }
}

# main.tf
resource "aws_sqs_queue" "principal" {
  name = "${local.prefix}-principal"
  tags = local.tags
}

resource "aws_sqs_queue" "secundaria" {
  name = "${local.prefix}-secundaria"
  tags = local.tags
}

# outputs.tf
output "principal_url" { value = aws_sqs_queue.principal.id }
output "secundaria_url" { value = aws_sqs_queue.secundaria.id }
```

### Paso 2: Desplegar inicial

```bash
terraform init
terraform fmt
terraform validate
terraform plan -out=inicial.tfplan
terraform apply inicial.tfplan
```

### Paso 3: Inspeccionar estado

```bash
# Listar recursos en estado
terraform state list

# Mostrar detalles de un recurso
terraform state show aws_sqs_queue.principal

# Ver estado completo (JSON)
terraform show -json terraform.tfstate | jq '.values.root_module.resources[] | {address: .address, type: .type, name: .values.name}'

# Ver metadatos del estado
terraform show -json terraform.tfstate | jq '{version: .version, serial: .serial, lineage: .lineage, terraform_version: .terraform_version}'
```

### Paso 3: Copia de seguridad del estado

```bash
# Backup manual
cp terraform.tfstate terraform.tfstate.backup.$(date +%Y%m%d_%H%M%S)

# O usar terraform state pull (funciona con backend remoto también)
terraform state pull > estado-backup.json
```

### Paso 4: Drift - Cambio externo

```bash
# Modificar cola via aws_local (fuera de Terraform)
aws_local sqs set-queue-attributes \
  --queue-url $(terraform output -raw principal_url) \
  --attributes VisibilityTimeout=60

# Detectar drift
terraform plan
# Observar: ~ aws_sqs_queue.principal -> VisibilityTimeout cambiará 30 -> 60
```

### Paso 5: Renombrar recurso sin recrear (`moved`)

```hcl
# En main.tf, renombrar recurso:
# ANTES: resource "aws_sqs_queue" "principal" { ... }
# DESPUÉS: resource "aws_sqs_queue" "cola_principal" { ... }

# Añadir bloque moved:
moved {
  from = aws_sqs_queue.principal
  to   = aws_sqs_queue.cola_principal
}
```

```bash
terraform plan
# Observar: "moved" en lugar de destroy + create
terraform apply
terraform state list
# Debe mostrar: aws_sqs_queue.cola_principal
```

### Paso 6: Importar recurso existente

```bash
# Crear cola fuera de Terraform
aws_local sqs create-queue --queue-name externo-importada-001

# Importar al estado
terraform import aws_sqs_queue.importada externo-importada-001

# Verificar en estado
terraform state show aws_sqs_queue.importada

# Generar configuración para gestionarla (opcional)
# resource "aws_sqs_queue" "importada" { name = "externo-importada-001" }
```

### Paso 6: Desvincular recurso (state rm)

```bash
# Desvincular sin destruir en LocalStack
terraform state rm aws_sqs_queue.secundaria

# Verificar: ya no en estado
terraform state list

# La cola sigue existiendo en LocalStack
aws_local sqs get-queue-attributes --queue-url $(terraform output -raw secundaria_url)
```

### Paso 7: Recuperar estado corrupto/perdido

```bash
# Simular pérdida: borrar estado
rm terraform.tfstate

# Recuperar desde backup
cp terraform.tfstate.backup terraform.tfstate
# O: terraform state push estado-backup.json

# Verificar
terraform plan
```

### Paso 8: Limpiar

```bash
terraform destroy -auto-approve
aws_local sqs list-queues
docker compose down
```

---

## 8. Sesiones guiadas

### 8.1. Sesión 1: Inspección y backup (25 min)

1. Desplegar 2 colas
2. `state list`, `state show`, `show -json`
3. Backup manual y `state pull`
4. **Entrega**: Lista recursos + backup + metadatos estado

### 8.2. Sesión 2: Drift, moved, import (35 min)

1. Drift externo via `aws_local` → `plan` detecta
3. Renombrar recurso con `moved` → `plan` muestra moved
4. Crear recurso externo → `import` → gestionar
5. **Entrega**: Evidencia drift + moved + import

### 8.3. Sesión 3: State rm, recuperación, limpieza (25 min)

1. `state rm` → recurso sigue en LocalStack
2. Borrar estado → recuperar de backup → `plan` OK
3. `destroy` → limpiar
4. **Entrega**: Evidencia state rm + recuperación + limpieza

---

## 9. Ejercicios de refuerzo

### 9.1. Ejercicio de identificación

Explica la diferencia entre:
- `terraform.tfstate` vs `.terraform.lock.hcl`
- `terraform state list` vs `terraform state show`
- `moved` vs renombrar recurso en configuración sin `moved`
- `terraform import` vs `terraform state rm` vs recrear recurso

### 9.2. Ejercicio de interpretación

Un equipo hace:
1. `terraform apply` (crea bucket)
2. Alguien borra bucket via consola AWS
3. `terraform plan` → ¿qué muestra?
4. `terraform apply` → ¿qué hace?
5. ¿Cómo recuperar sin recrear?

### 9.3. Ejercicio con asistente de IA

```text
Instrucción:
Genera un script Bash que:
1. Haga backup del estado actual con timestamp
2. Ejecute `terraform plan` y detecte si hay drift (cambios no planificados)
3. Si hay drift, alerte y muestre qué recursos cambiaron
4. Opcional: genere comando `terraform import` para recursos huérfanos detectados
Usa: terraform show -json, jq, awk.
```

---

## 10. Limitaciones LocalStack en estado

| Característica | LocalStack | AWS Real |
|----------------|------------|----------|
| Estado local | ✅ Idéntico | ✅ |
| Backend remoto (S3) | ✅ (ver 07-05) | ✅ |
| Locking (DynamoDB) | ✅ (ver 07-06) | ✅ |
| Import/Export | ✅ | ✅ |
| Concurrencia real | ❌ (single user) | ✅ (locking) |

---

## 11. Diagnóstico de errores frecuentes

| Error | Causa | Solución |
|-------|-------|----------|
| `Error loading state` | Archivo corrupto/borrado | Restaurar backup / `state push` |
| `Resource already managed` | Import duplicado | `state rm` previo o nombre distinto |
| `Resource not found` en import | Nombre/ID incorrecto | Verificar nombre en LocalStack |
| `moved` block not allowed | Sintaxis/versión Terraform | Terraform 1.1+, sintaxis correcta |
| `state rm` no quita de LocalStack | Correcto: solo quita de estado | Entender: estado ≠ servicio |

---

## 12. Evaluación y cierre

### 12.1. Rúbrica (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Inspección | No usa `state list/show` | Usa básicos | `list`, `show`, `show -json`, metadatos |
| Backup | No hace | Manual | `state pull` + backup timestamp |
| Drift | No detecta | Detecta sin resolver | Detecta + explica + corrige |
| Moved/Import | No usa | Uno básico | Moved + Import + State rm |
| Recuperación | No prueba | Entiende | Borra estado → restaura backup → plan OK |

### 12.2. Checklist final

- [ ] `terraform state list` y `show` usados
- [ ] `terraform show -json` para análisis
- [ ] Backup manual + `state pull`
- [ ] Drift introducido y detectado con `plan`
- [ ] Recurso renombrado con `moved` (sin recrear)
- [ ] Recurso externo importado con `import`
- [ ] Recurso desvinculado con `state rm` (persiste en LocalStack)
- [ ] Estado borrado y recuperado de backup
- [ ] `terraform destroy` limpia todo

### 12.3. Idea principal

> **Estado = memoria de Terraform. Configuración = intención. API = realidad.**
> El estado conecta configuración con recursos reales.
> **Protege el estado: backup, locking (backend remoto), no edites a mano.**
> **`moved` = renombrar sin dolor. `import` = adoptar huérfanos. `state rm` = soltar sin matar.**
