# Primer despliegue: un bucket S3 con Terraform y LocalStack

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

Tu primer despliegue servirá para comprender el ciclo completo de Terraform.
Crearás un bucket S3, comprobarás sus propiedades y probarás operaciones con un objeto.
Después modificarás una etiqueta, revisarás la convergencia y eliminarás los recursos.

El objetivo no es memorizar una secuencia de comandos.
El objetivo es relacionar **configuración, plan, estado y API**.
Cada herramienta aporta evidencias distintas sobre el mismo laboratorio.

Terraform gestionará el bucket.
AWS CLI (vía `aws_local`) realizará consultas y una prueba de contenido.
LocalStack proporcionará la API local utilizada por ambos clientes.

La documentación incluye un laboratorio principal y ampliaciones opcionales.
Las ampliaciones deben realizarse antes de la limpieza final.
No ejecutes varias configuraciones alternativas simultáneamente.

---

## 1. Objetivos de aprendizaje

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Explicar qué representa un bucket S3.
- Diferenciar un bucket y un objeto.
- Relacionar configuración, plan y estado.
- Interpretar creación, actualización y destrucción.
- Distinguir resultados observados y resultados esperados.

### 1.2. Objetivos prácticos

También podrás:

- Crear un bucket mediante Terraform.
- Verificarlo mediante `aws_local`.
- Subir y recuperar contenido ficticio.
- Modificar una etiqueta sin cambiar el nombre.
- Limpiar el laboratorio con un alcance explícito.

---

## 2. Alcance del primer despliegue

### 2.1. Recursos principales

Crearemos:

- Un bucket S3 gestionado por Terraform.
- Un archivo ficticio en el anfitrión.
- Un objeto S3 creado mediante `aws_local`.

El objeto de CLI se eliminará antes de destruir el bucket.
Una ampliación permitirá gestionar otro objeto mediante Terraform.

### 2.2. Lo que no configuraremos

No añadiremos:

- Identidades reales de AWS.
- Políticas IAM de producción.
- Replicación.
- Notificaciones.
- Sitios web públicos.
- Versionado en el laboratorio principal.

### 2.3. Regla de alcance

No interpretes una prueba de contenido como validación completa de S3.

---

## 3. Requisitos previos

### 3.1. Conocimientos necesarios

Debes saber:

- Abrir una terminal Bash.
- Crear y editar archivos.
- Ejecutar Docker Compose.
- Identificar un endpoint local.
- Leer un bloque HCL sencillo.
- Distinguir recursos y archivos.

### 3.2. Comprobaciones iniciales

```bash
terraform version
docker version
docker compose version
aws --version
```

### 3.3. Criterio de avance

Docker debe mostrar un servidor disponible.
AWS CLI debe corresponder a la versión 2 para los comandos de esta página.
Resuelve instalación y permisos antes de continuar.

---

## 4. Versiones y compatibilidad

### 4.1. Base didáctica

Utilizaremos:

- Terraform desde 1.6 y anterior a 2.0.
- Provider de AWS dentro de la serie 5.
- Una imagen de LocalStack seleccionada por el docente (ej. 3.7.0).

Estas restricciones no representan una lista de versiones más recientes.
El docente debe probar la combinación antes de impartir la sesión.

### 4.2. Registro del entorno

Conserva:

- Versión de Terraform CLI.
- Versión efectiva del provider.
- Imagen y modalidad de LocalStack.
- Docker y Docker Compose.
- AWS CLI.
- Sistema y arquitectura.

### 4.3. Evidencia honesta

Esta página describe un procedimiento; no afirma haberlo ejecutado en tu equipo.

---

## 5. Configuración del laboratorio (Ubuntu 24.04 + Docker + LocalStack)

### 5.1. Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    Equipo Anfitrión (Ubuntu 24.04)         │
│  ┌──────────────┐  ┌──────────────────┐                    │
│  │   Terraform  │  │   aws_local()    │                    │
│  │   (gestión)  │  │  (verificación)  │                    │
│  └──────┬───────┘  └────────┬─────────┘                    │
│         │                   │                              │
│         └───────────────────┼──────────────────────────────┘
│                             ▼                              │
│              http://127.0.0.1:4566                          │
│                             │                              │
│                             ▼                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Docker Container: LocalStack             │  │
│  │  ┌────────────────────────────────────────────────┐   │  │
│  │  │  Bucket: tf-aula-bucket-001                    │   │  │
│  │  │  Objeto: documentos/mensaje.txt                │   │  │
│  │  └────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 5.2. `compose.yaml`

```yaml
services:
  localstack:
    image: localstack/localstack:3.7.0
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: s3,sts
      AWS_DEFAULT_REGION: us-east-1
      DEBUG: "1"
    volumes:
      - localstack_data:/var/lib/localstack

volumes:
  localstack_data:
```

### 5.3. `aws_local`

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

### 5.4. Archivos Terraform

```hcl
# versions.tf
terraform {
  required_version = ">= 1.6.0, < 2.0.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

# providers.tf
provider "aws" {
  region = "us-east-1"
  access_key = "test"
  secret_key = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_region_validation      = true
  skip_requesting_account_id  = true
  s3_use_path_style = true
  endpoints { s3 = "http://127.0.0.1:4566", sts = "http://127.0.0.1:4566" }
}

# variables.tf
variable "bucket_name" {
  type        = string
  default     = "tf-aula-bucket-001"
  validation {
    condition = can(regex("^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$", var.bucket_name))
    error_message = "3-63 chars: minúsculas, números, guiones."
  }
}

# main.tf
resource "aws_s3_bucket" "principal" {
  bucket = var.bucket_name
  force_destroy = false
  tags = {
    Curso   = "Terraform"
    Entorno = "LocalStack"
    Leccion = "PrimerDespliegue"
  }
}

# outputs.tf
output "bucket_name" { value = aws_s3_bucket.principal.bucket }
output "bucket_arn"  { value = aws_s3_bucket.principal.arn }
```

---

## 6. Práctica guiada paso a paso

### Paso 1: Preparar directorio

```bash
mkdir -p primer-despliegue/evidencias
cd primer-despliegue
```

### Paso 2: Arrancar LocalStack

```bash
docker compose up -d
docker compose ps
curl -s http://127.0.0.1:4566/_localstack/health | jq .
source .env.localstack  # o definir aws_local aquí
aws_local s3api list-buckets  # Debe estar vacío
```

### Paso 3: Crear archivos Terraform

```bash
# Crear: versions.tf, providers.tf, variables.tf, main.tf, outputs.tf
```

### Paso 4: Ciclo Terraform - Crear

```bash
terraform init
terraform fmt
terraform validate
terraform plan -out=creacion.tfplan
terraform show creacion.tfplan
# Revisar: + aws_s3_bucket.principal
terraform apply creacion.tfplan
```

### Paso 5: Verificar con Terraform

```bash
terraform output
terraform state list
terraform state show aws_s3_bucket.principal
```

### Paso 6: Verificar con `aws_local` (independiente)

```bash
aws_local s3api list-buckets
aws_local s3api head-bucket --bucket tf-aula-bucket-001
aws_local s3api get-bucket-tagging --bucket tf-aula-bucket-001
```

### Paso 7: Prueba de contenido con `aws_local` (imperativo)

```bash
echo "Contenido ficticio del laboratorio." > mensaje.txt

aws_local s3api put-object \
  --bucket tf-aula-bucket-001 \
  --key documentos/mensaje.txt \
  --body mensaje.txt

aws_local s3api list-objects-v2 --bucket tf-aula-bucket-001

aws_local s3api get-object \
  --bucket tf-aula-bucket-001 \
  --key documentos/mensaje.txt \
  mensaje-descargado.txt

diff mensaje.txt mensaje-descargado.txt  # Sin salida = idénticos
```

> **Nota**: Este objeto NO está en el estado de Terraform. Se gestiona por separado.

### Paso 8: Modificación controlada - Cambiar etiquetas

```hcl
# En main.tf, modificar tags:
tags = {
  Curso   = "Terraform"
  Entorno = "LocalStack"
  Leccion = "PrimerDespliegue"
  Practica = "CambioControlado"  # NUEVO
}
```

```bash
terraform fmt
terraform validate
terraform plan -out=etiquetas.tfplan
terraform show etiquetas.tfplan
# Revisar: ~ tags.Practica
terraform apply etiquetas.tfplan
```

### Paso 9: Verificar convergencia

```bash
terraform plan
# No changes. Infrastructure is up-to-date.

aws_local s3api get-bucket-tagging --bucket tf-aula-bucket-001
# Debe mostrar la nueva etiqueta
```

### Paso 10: Ampliación opcional - Objeto gestionado por Terraform

```hcl
# Añadir a main.tf
resource "aws_s3_object" "gestionado" {
  bucket = aws_s3_bucket.principal.bucket
  key    = "terraform/gestionado.txt"
  content = "Gestionado por Terraform"
  content_type = "text/plain"
}
```

```bash
terraform plan -out=objeto.tfplan
terraform apply objeto.tfplan

# Verificar
aws_local s3api get-object --bucket tf-aula-bucket-001 --key terraform/gestionado.txt obj-tf.txt
cat obj-tf.txt
```

### Paso 11: Limpiar objeto CLI (antes de destroy)

```bash
aws_local s3api delete-object --bucket tf-aula-bucket-001 --key documentos/mensaje.txt
aws_local s3api list-objects-v2 --bucket tf-aula-bucket-001
```

### Paso 12: Destruir recursos Terraform

```bash
terraform plan -destroy -out=destroy.tfplan
terraform show destroy.tfplan
terraform apply destroy.tfplan
```

### Paso 13: Verificar limpieza total

```bash
terraform state list  # Debe estar vacío
aws_local s3api list-buckets  # Debe estar vacío
```

### Paso 14: Detener LocalStack

```bash
docker compose down
```

---

## 7. Sesiones guiadas para el alumnado

### 7.1. Sesión 1: Despliegue y verificación (35 min)

1. Arrancar LocalStack, health check, `aws_local`
2. Escribir archivos Terraform (versions, providers, variables, main, outputs)
3. Ciclo: `init` → `fmt` → `validate` → `plan` → `apply`
4. Verificar con `terraform output` + `aws_local` (dual)
5. **Entrega**: Plan + apply + verificación dual + explicación de qué NO demuestra

### 7.2. Sesión 2: Contenido y modificación (25 min)

1. Subir objeto con `aws_local` → listar → descargar → `diff`
2. Modificar etiquetas en HCL → `plan` → `apply`
4. Verificar convergencia (`plan` sin cambios) + `aws_local` tags
5. **Entrega**: Evidencia objeto CLI + plan etiquetas + convergencia

### 7.3. Sesión 3: Ampliación y limpieza (20 min)

1. (Opcional) Añadir `aws_s3_object` gestionado por Terraform
2. Limpiar objeto CLI (`delete-object`)
3. `plan -destroy` → `apply` → verificar estado vacío
4. `docker compose down`
5. **Entrega**: Registro limpieza distinguida (CLI vs Terraform)

---

## 8. Ejercicios de refuerzo

### 8.1. Ejercicio de identificación

Explica la diferencia entre:
- `terraform output` vs `aws_local s3api head-bucket`
- Objeto creado por `aws_local` vs `aws_s3_object` en Terraform
- `force_destroy = false` vs `true`

### 8.2. Ejercicio de interpretación

Compara:
- Cambiar etiqueta (actualización in-place) vs cambiar nombre del bucket (reemplazo)
Genera planes para ambos. No apliques el reemplazo. Documenta la diferencia.

### 8.3. Ejercicio con asistente de IA

```text
Instrucción:
Explica a un estudiante el ciclo completo de este laboratorio.
Usa: configuración → plan → apply → estado → verificación → modificación → convergencia → limpieza.
Distingue qué hace Terraform y qué hace aws_local en cada paso.
No inventes salidas. Usa los comandos reales de esta lección.
```

---

## 9. Limitaciones de LocalStack en esta lección

| Operación | LocalStack | AWS Real |
|-----------|------------|----------|
| Create bucket | ✅ | ✅ (nombre global único) |
| Put/Get object | ✅ | ✅ |
| Bucket tagging | ✅ | ✅ |
| Versionado | ⚠️ Básico | ✅ Completo |
| Replicación | ❌ | ✅ |
| Object Lock | ❌ | ✅ |
| CORS completo | ⚠️ Parcial | ✅ |

---

## 10. Diagnóstico de errores frecuentes

| Síntoma | Qué comprobar | Qué evitar |
|---------|---------------|------------|
| `connection refused` | LocalStack, puerto 4566 | Cambiar a AWS real |
| `BucketAlreadyExists` | Nombre único en LocalStack | Reusar sin verificar |
| `NoSuchBucket` | Nombre correcto, bucket existe | Asumir existencia sin `head-bucket` |
| Plan muestra reemplazo inesperado | Cambio en `bucket` (fuerza recreate) | Aplicar sin leer plan |
| Objeto no aparece en `state list` | Creado por CLI, no por Terraform | Esperar que Terraform lo vea |

---

## 11. Evaluación y cierre

### 11.1. Rúbrica (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Despliegue | No crea bucket | Crea pero no verifica | Ciclo completo + verificación dual |
| Verificación | Solo Terraform | Solo aws_local | Ambas + explicación límites |
| Modificación | No modifica | Modifica sin plan | Plan → apply → convergencia |
| Contenido | No prueba | Sube pero no baja | Sube + baja + diff + limpieza CLI |
| Limpieza | No limpia | Parcial | Destroy + list-buckets vacío + compose down |

### 11.2. Checklist final

- [ ] LocalStack arrancado y health check OK
- [ ] `aws_local` definida y funcional
- [ ] Archivos Terraform creados y validados
- [ ] `terraform plan` revisado ANTES de apply
- [ ] Bucket creado y verificado (Terraform + aws_local)
- [ ] Objeto CLI subido, descargado, verificado con diff
- [ ] Etiquetas modificadas via HCL + plan + apply
- [ ] Convergencia verificada (`plan` sin cambios)
- [ ] Objeto CLI eliminado ANTES de destroy
- [ ] `terraform destroy` ejecutado y verificado
- [ ] `aws_local s3api list-buckets` vacío
- [ ] `docker compose down`

### 11.3. Idea principal

> **Configuración → Plan → Apply → Estado → Verificación → Limpieza.**
> Terraform gestiona; `aws_local` verifica independientemente.
> **Cada paso tiene su evidencia. Sin evidencia, no pasó.**
