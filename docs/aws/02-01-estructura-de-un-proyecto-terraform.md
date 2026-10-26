# Estructura de un proyecto Terraform con LocalStack emulando AWS

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

Un proyecto Terraform es más que un conjunto de archivos con extensión `.tf`.
También incluye decisiones sobre entradas, dependencias, estado, documentación y procedimientos de trabajo.
Su estructura debe permitir entender qué se gestiona y repetir las operaciones con seguridad.
En esta lección construirás un proyecto pequeño, organizado y verificable.

El laboratorio utilizará un bucket S3 dentro de LocalStack.
Docker Compose gestionará el servicio de emulación.
Terraform gestionará el bucket.
AWS CLI (vía `aws_local`) aportará una comprobación independiente.

Primero organizaremos el módulo raíz.
Después estudiaremos qué archivos se comparten y cuáles permanecen locales.
Finalmente practicaremos cambios de estructura y una introducción a módulos reutilizables.

---

## 1. Objetivos de aprendizaje

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Definir qué es un módulo raíz.
- Diferenciar archivos de configuración y archivos generados.
- Explicar cómo Terraform interpreta los archivos de un directorio.
- Distinguir configuración, estado y recursos existentes.
- Reconocer el papel del archivo de bloqueo.

### 1.2. Objetivos prácticos

También podrás:

- Crear una estructura de proyecto.
- Separar versiones, providers, variables, recursos y salidas.
- Ejecutar Terraform desde el directorio correcto.
- Verificar recursos mediante `aws_local`.
- Documentar entradas y procedimientos.
- Limpiar los recursos antes de retirar LocalStack.

---

## 2. Alcance de la lección

### 2.1. Laboratorio principal

El proyecto incluirá:

- Un archivo de Docker Compose.
- Un módulo raíz dentro de `infra/`.
- Un bucket S3.
- Variables de entrada.
- Valores locales.
- Salidas.
- Documentación y evidencias.

### 2.2. Ampliación

Introduciremos un módulo hijo local.
La ampliación será un refactor de estructura, no otro laboratorio independiente.
Utilizaremos un bloque `moved` para preservar la relación de gestión.
No aplicaremos cambios si aparece un reemplazo inesperado.

### 2.3. Exclusiones

No configuraremos AWS real, backends remotos ni un sistema corporativo de despliegue.

---

## 3. Requisitos previos

### 3.1. Conocimientos necesarios

Debes saber:

- Abrir una terminal Bash.
- Crear directorios.
- Editar texto.
- Arrancar Docker Compose.
- Identificar un endpoint local.
- Interpretar un plan básico.

### 3.2. Comprobaciones

```bash
terraform version
docker version
docker compose version
aws --version
```

### 3.3. Condición del entorno

Docker debe poder comunicarse con su servidor.
AWS CLI debe corresponder a la versión requerida por el curso.
Terraform debe cumplir las restricciones del proyecto.
El docente debe probar la combinación antes de impartir la práctica.

---

## 4. Versiones y reproducibilidad

### 4.1. Información que debes registrar

Anota:

- Terraform CLI.
- Provider de AWS.
- Docker.
- Docker Compose.
- AWS CLI.
- Imagen de LocalStack.
- Sistema y arquitectura.

### 4.2. Referencias didácticas

La configuración permitirá Terraform desde 1.6 y anterior a 2.0.
El provider de AWS se limitará a la serie 5.
Estas restricciones son una base del ejemplo, no una declaración de versiones actuales.
La referencia de LocalStack la proporcionará el docente.

### 4.3. Actualizaciones

No actualices herramientas durante una comparación sin registrarlo.
Una actualización puede modificar planes y comportamientos.
Repite las comprobaciones relevantes cuando cambie una dependencia.

---

## 5. Qué es un proyecto Terraform

Un proyecto reúne configuración y procedimientos para gestionar un alcance concreto.

### 5.1. Componentes habituales

- **Módulo raíz**: Directorio donde se ejecuta `terraform init`.
- **Archivos `.tf`**: Configuración (versiones, providers, variables, recursos, outputs, locals).
- **Archivos generados**: `.terraform/`, `.terraform.lock.hcl`, `*.tfstate`, `*.tfplan`.
- **Documentación**: `README.md`, `evidencias/`, diagramas.
- **Entorno**: `compose.yaml`, `.env.localstack`, scripts auxiliares.

### 5.2. Módulo raíz vs módulos hijos

- **Módulo raíz**: Donde se ejecuta Terraform. Contiene configuración de backend, providers, y llama a módulos hijos.
- **Módulos hijos**: Directorios con archivos `.tf` que se invocan con bloques `module`. No tienen backend propio.

---

## 6. Configuración del laboratorio (Ubuntu 24.04 + Docker + LocalStack)

### 6.1. Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    Equipo Anfitrión (Ubuntu 24.04)         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Directorio del proyecto                              │  │
│  │  ├── compose.yaml                                     │  │
│  │  ├── .env.localstack                                  │  │
│  │  └── infra/              ← Módulo raíz (terraform)   │  │
│  │      ├── versions.tf                                  │  │
│  │      ├── providers.tf                                 │  │
│  │      ├── variables.tf                                 │  │
│  │      ├── locals.tf                                    │  │
│  │      ├── main.tf                                      │  │
│  │      ├── outputs.tf                                   │  │
│  │      ├── .gitignore                                   │  │
│  │      └── evidencias/                                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                 │
│                           ▼                                 │
│              http://127.0.0.1:4566                          │
│                           │                                 │
│                           ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Docker Container: LocalStack             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 6.2. Archivo `compose.yaml` (raíz del proyecto)

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

### 6.3. Función `aws_local` (en `.env.localstack`)

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
export -f aws_local
```

---

## 7. Estructura del módulo raíz (`infra/`)

### 7.1. `versions.tf`

```hcl
terraform {
  required_version = ">= 1.6.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

### 7.2. `providers.tf`

```hcl
provider "aws" {
  region     = var.aws_region
  access_key = "test"
  secret_key = "test"

  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_region_validation      = true
  skip_requesting_account_id  = true

  s3_use_path_style = true

  endpoints {
    s3  = "http://127.0.0.1:4566"
    sts = "http://127.0.0.1:4566"
  }
}
```

### 7.3. `variables.tf`

```hcl
variable "aws_region" {
  description = "Región de referencia del laboratorio local."
  type        = string
  default     = "us-east-1"
}

variable "project_prefix" {
  description = "Prefijo para nombres de recursos."
  type        = string
  default     = "tf-aula"
}

variable "bucket_name" {
  description = "Nombre del bucket S3 de práctica."
  type        = string
  default     = "tf-aula-proyecto-001"

  validation {
    condition = can(regex("^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$", var.bucket_name))
    error_message = "Usa 3-63 chars: minúsculas, números, guiones."
  }
}
```

### 7.4. `locals.tf`

```hcl
locals {
  common_tags = {
    Proyecto   = "Terraform-LocalStack"
    Entorno    = "LocalStack"
    Gestionado = "Terraform"
  }

  bucket_name = "${var.project_prefix}-${var.bucket_name}"
}
```

### 7.5. `main.tf`

```hcl
resource "aws_s3_bucket" "principal" {
  bucket = local.bucket_name

  tags = merge(local.common_tags, {
    Recurso = "BucketPrincipal"
  })
}
```

### 7.6. `outputs.tf`

```hcl
output "bucket_name" {
  description = "Nombre del bucket gestionado."
  value       = aws_s3_bucket.principal.bucket
}

output "bucket_arn" {
  description = "ARN del bucket."
  value       = aws_s3_bucket.principal.arn
}

output "bucket_tags" {
  description = "Etiquetas aplicadas."
  value       = aws_s3_bucket.principal.tags
}
```

### 7.7. `.gitignore`

```gitignore
# Terraform
.terraform/
*.tfstate
*.tfstate.*
*.tfplan
*.tfvars
*.tfvars.json

# LocalStack
.env.localstack

# Logs
crash.log
crash.*.log

# Overrides
override.tf
override.tf.json
*_override.tf
*_override.tf.json

# OS
.DS_Store
```

---

## 8. Práctica guiada paso a paso

### Paso 1: Crear estructura de directorios

```bash
mkdir -p proyecto-terraform/{infra/evidencias}
cd proyecto-terraform
```

### Paso 2: Crear `compose.yaml` y `.env.localstack` en raíz

```bash
# compose.yaml (sección 6.2)
# .env.localstack (sección 6.3)
```

### Paso 3: Arrancar LocalStack

```bash
docker compose up -d
docker compose ps
curl -s http://127.0.0.1:4566/_localstack/health | jq .
source .env.localstack
aws_local s3api list-buckets
```

### Paso 4: Crear archivos en `infra/`

```bash
cd infra
# Crear: versions.tf, providers.tf, variables.tf, locals.tf, main.tf, outputs.tf, .gitignore
```

### Paso 5: Ciclo Terraform

```bash
terraform init
terraform fmt
terraform validate
terraform plan -out=creacion.tfplan
terraform show creacion.tfplan
terraform apply creacion.tfplan
```

### Paso 6: Verificar con `aws_local`

```bash
terraform output
aws_local s3api list-buckets
aws_local s3api head-bucket --bucket $(terraform output -raw bucket_name)
aws_local s3api get-bucket-tagging --bucket $(terraform output -raw bucket_name)
```

### Paso 7: Ampliación - Módulo hijo local

```bash
# Crear módulo hijo
mkdir -p modules/bucket

# modules/bucket/main.tf
cat > modules/bucket/main.tf <<'EOF'
variable "bucket_name" { type = string }
variable "tags" { type = map(string), default = {} }

resource "aws_s3_bucket" "modulo" {
  bucket = var.bucket_name
  tags   = var.tags
}

output "bucket_name" { value = aws_s3_bucket.modulo.bucket }
output "bucket_arn"  { value = aws_s3_bucket.modulo.arn }
EOF

# En infra/main.tf: refactorizar usando module + moved
```

```hcl
# infra/main.tf (refactorizado)
module "bucket_principal" {
  source = "../modules/bucket"
  bucket_name = local.bucket_name
  tags = local.common_tags
}

# Bloque moved para preservar estado
moved {
  from = aws_s3_bucket.principal
  to   = module.bucket_principal.aws_s3_bucket.modulo
}
```

```bash
terraform init
terraform plan  # Debe mostrar "moved" sin reemplazo
terraform apply
```

### Paso 8: Verificar refactor

```bash
terraform state list
aws_local s3api list-buckets
```

### Paso 9: Limpiar

```bash
terraform plan -destroy -out=destroy.tfplan
terraform apply destroy.tfplan
aws_local s3api list-buckets
cd ..
docker compose down
```

---

## 9. Sesiones guiadas para el alumnado

### 9.1. Sesión 1: Estructura base (30 min)

1. Crear directorios y archivos raíz (`compose.yaml`, `.env.localstack`)
2. Arrancar LocalStack, health check, `aws_local`
3. Crear estructura `infra/` con archivos separados
4. `terraform init` → `fmt` → `validate` → `plan` → `apply`
5. Verificar con `aws_local`
6. **Entrega**: Árbol de directorios + plan + verificación

### 9.2. Sesión 2: Refactor a módulo hijo (30 min)

1. Crear `modules/bucket/`
2. Mover lógica de bucket a módulo
3. Actualizar `infra/main.tf` con `module` + `moved`
4. `terraform init` → `plan` (verificar "moved") → `apply`
6. Verificar estado y `aws_local`
7. **Entrega**: Plan con `moved` + estado final + verificación

### 9.3. Sesión 3: Limpieza y documentación (15 min)

1. `terraform destroy` → verificar
2. `docker compose down`
3. Documentar estructura final en `README.md`
4. **Entrega**: `README.md` + evidencias limpieza

---

## 10. Ejercicios de refuerzo

### 10.1. Ejercicio de identificación

Explica la función de:
- `versions.tf` vs `.terraform.lock.hcl`
- `providers.tf` en módulo raíz vs módulo hijo
- `locals.tf` vs `variables.tf`
- Bloque `moved` vs renombrar recurso manualmente

### 10.2. Ejercicio de interpretación

¿Qué pasa si:
- Ejecutas `terraform init` en la raíz del proyecto (fuera de `infra/`)?
- Olvidas el bloque `moved` al refactorizar?
- Tienes dos `provider "aws"` en módulos diferentes?

Genera planes para verificar (no apliques si hay reemplazo inesperado).

### 10.3. Ejercicio con asistente de IA

```text
Instrucción:
Explica a un estudiante por qué separar archivos en versions.tf, providers.tf, variables.tf, etc.
en lugar de poner todo en main.tf.
Incluye: mantenibilidad, reutilización, revisión, bloqueo de versiones.
No inventes beneficios. Usa ejemplos de esta lección.
```

---

## 11. Limitaciones de LocalStack en esta lección

| Aspecto | LocalStack | AWS Real |
|---------|------------|----------|
| Módulos | ✅ Funcionan igual | ✅ Funcionan igual |
| `moved` blocks | ✅ Funcionan | ✅ Funcionan |
| Backend remoto | ⚠️ S3 local (módulo 07) | ✅ S3 + DynamoDB locking |
| Workspaces | ✅ Funcionan | ✅ Funcionan |

---

## 12. Diagnóstico de errores frecuentes

| Síntoma | Qué comprobar | Qué evitar |
|---------|---------------|------------|
| `terraform init` falla en directorio equivocado | `pwd`, estructura directorios | Ejecutar desde raíz sin `infra/` |
| `moved` muestra reemplazo | Bloque `moved` correcto, `terraform init` | Forzar apply sin entender plan |
| Módulo hijo no encontrado | `source` relativo correcto | Usar rutas absolutas |
| Variables no pasan a módulo | `variable` declarada en módulo hijo | Asumir herencia automática |

---

## 13. Evaluación y cierre

### 13.1. Rúbrica (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Estructura | Desorganizada | Funcional pero mezclada | Separada (raíz, infra, modules, evidencias) |
| Archivos | Todo en main.tf | Separación básica | Completa: versions, providers, vars, locals, main, outputs |
| Módulo hijo | No creado | Creado pero sin `moved` | Creado + `moved` + plan sin reemplazo |
| Verificación | Sin `aws_local` | Básica | `aws_local` + state list + tags |
| Documentación | Sin README | Parcial | README + árbol + decisiones |

### 13.2. Checklist final

- [ ] Estructura de directorios creada (raíz, infra/, modules/, evidencias/)
- [ ] `compose.yaml` y `.env.localstack` en raíz
- [ ] Archivos Terraform separados por responsabilidad
- [ ] `terraform init` funciona en `infra/`
- [ ] Bucket creado y verificado con `aws_local`
- [ ] Refactor a módulo hijo con `moved` (opcional)
- [ ] Limpieza completa: destroy → list-buckets vacío → `docker compose down`

### 13.3. Idea principal

> **Estructura clara = proyecto mantenible.**
> Separar responsabilidades (versiones, providers, variables, módulos) permite escalar.
> **Módulo raíz orquesta; módulos hijos implementan; `aws_local` verifica.**
