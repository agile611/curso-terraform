# Configuración del provider de AWS para LocalStack con Terraform

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

El provider de AWS permite que Terraform gestione recursos mediante APIs compatibles con los servicios de AWS.
En este laboratorio dirigiremos esas solicitudes a LocalStack mediante endpoints explícitos.
La sintaxis de los recursos seguirá siendo la del provider, pero el destino será un entorno de emulación local.

Configurar el provider no consiste únicamente en escribir una dirección.
También implica controlar credenciales, región, comprobaciones auxiliares y servicios utilizados.
Esta lección desarrolla esas decisiones y propone sesiones para comprobarlas con evidencias.

El laboratorio principal utiliza S3.
Las ampliaciones introducen SQS, aliases y módulos.
Las ampliaciones solo deben ejecutarse cuando el docente haya comprobado su compatibilidad.

---

## 1. Objetivos de aprendizaje

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Diferenciar Terraform CLI y un provider.
- Explicar qué hace el provider de AWS.
- Identificar un endpoint por servicio.
- Distinguir credenciales ficticias y credenciales reales.
- Explicar las comprobaciones que se omiten en el laboratorio.

### 1.2. Objetivos prácticos

También podrás:

- Configurar un provider para LocalStack.
- Crear y verificar un bucket.
- Detectar endpoints incompletos.
- Interpretar errores de conexión.
- Pasar una configuración a un módulo.
- Limpiar recursos antes de detener el emulador.

---

## 2. Alcance de la lección

### 2.1. Componentes utilizados

Trabajaremos con:

- Terraform CLI (>= 1.6, < 2.0).
- Provider `hashicorp/aws` (~> 5.0).
- Docker Compose.
- LocalStack (3.7.0).
- AWS CLI v2 (vía `aws_local`).
- Bash.

### 2.2. Servicios previstos

S3 será el servicio principal.
STS aparecerá como endpoint auxiliar.
SQS será una ampliación opcional.
No se utilizarán recursos de otros servicios sin revisar sus conexiones.

### 2.3. Exclusiones

No configuraremos credenciales reales, backends remotos ni permisos IAM productivos.

---

## 3. Requisitos previos

### 3.1. Conocimientos necesarios

Debes saber:

- Crear carpetas.
- Editar archivos HCL.
- Ejecutar Docker Compose.
- Identificar un puerto local.
- Interpretar un plan sencillo.
- Diferenciar configuración y estado.

### 3.2. Comprobaciones

```bash
terraform version
docker version
docker compose version
aws --version
```

### 3.3. Criterio de avance

Docker debe mostrar un servidor disponible.
Los ejecutables deben corresponder a las versiones previstas por el curso.

---

## 4. Versiones y compatibilidad

### 4.1. Base didáctica

Esta página utilizará:

- Terraform desde 1.6 y anterior a 2.0.
- Provider de AWS dentro de la serie 5.
- Una imagen de LocalStack seleccionada por el docente (ej. 3.7.0).

Estas restricciones no representan las versiones más recientes.
La configuración debe probarse antes de impartir la sesión.

### 4.2. Información que debes registrar

Anota:

- Terraform CLI.
- Provider seleccionado (desde `.terraform.lock.hcl`).
- Imagen y modalidad de LocalStack.
- Docker y Compose.
- AWS CLI.
- Sistema y arquitectura.

### 4.3. Actualizaciones

Una actualización exige revisar el esquema y repetir las pruebas relevantes.

---

## 5. Qué es un provider

Un provider es un componente que integra Terraform con una API o plataforma.

### 5.1. Responsabilidades

El provider define:

- Tipos de recursos (ej. `aws_s3_bucket`, `aws_sqs_queue`).
- Fuentes de datos (ej. `aws_s3_bucket`, `aws_iam_policy_document`).
- Esquemas de validación.
- Lógica de creación, lectura, actualización, eliminación (CRUD).
- Manejo de dependencias entre recursos.

### 5.2. Ciclo de vida del provider

```
terraform init
    ↓
Descarga plugin (hashicorp/aws v5.x.x)
    ↓
Registra tipos de recursos y data sources
    ↓
terraform plan/apply usa el provider para llamar a APIs
```

---

## 6. Configuración del laboratorio (Ubuntu 24.04 + Docker + LocalStack)

### 6.1. Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    Equipo Anfitrión (Ubuntu 24.04)         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Terraform + Provider AWS                             │  │
│  │  provider "aws" {                                     │  │
│  │    endpoints { s3 = "http://127.0.0.1:4566" }        │  │
│  │  }                                                    │  │
│  └────────────────────────┬─────────────────────────────┘  │
│                           ▼                                 │
│              http://127.0.0.1:4566                          │
│                           │                                 │
│                           ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Docker Container: LocalStack             │  │
│  │  ┌─────────┐  ┌─────────┐                            │  │
│  │  │   S3    │  │   STS   │                            │  │
│  │  └─────────┘  └─────────┘                            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 6.2. Archivo `compose.yaml`

```yaml
services:
  localstack:
    image: localstack/localstack:3.7.0
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: s3,sts,sqs
      AWS_DEFAULT_REGION: us-east-1
      DEBUG: "1"
    volumes:
      - localstack_data:/var/lib/localstack

volumes:
  localstack_data:
```

### 6.3. Función `aws_local`

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

## 7. Configuración del Provider: Anatomía completa

### 7.1. Configuración estándar para LocalStack

```hcl
# providers.tf
provider "aws" {
  # Región de referencia (debe coincidir con compose.yaml)
  region = var.aws_region

  # Credenciales ficticias (requeridas por el provider)
  access_key = "test"
  secret_key = "test"

  # Omitir validaciones que requieren AWS real
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_region_validation      = true
  skip_requesting_account_id  = true

  # S3 path style obligatorio para LocalStack
  s3_use_path_style = true

  # Endpoints explícitos por servicio
  endpoints {
    s3  = "http://127.0.0.1:4566"
    sts = "http://127.0.0.1:4566"
    # Añadir según servicios usados:
    # sqs     = "http://127.0.0.1:4566"
    # sns     = "http://127.0.0.1:4566"
    # dynamodb = "http://127.0.0.1:4566"
    # lambda  = "http://127.0.0.1:4566"
  }
}
```

### 7.2. Explicación de cada opción

| Opción | Valor | Por qué |
|--------|-------|---------|
| `region` | `var.aws_region` | Referencia lógica; debe coincidir con `AWS_DEFAULT_REGION` en compose |
| `access_key` / `secret_key` | `"test"` | Credenciales dummy; LocalStack no valida |
| `skip_credentials_validation` | `true` | Evita llamada a STS GetCallerIdentity en AWS real |
| `skip_metadata_api_check` | `true` | Evita consultar metadata EC2 (169.254.169.254) |
| `skip_region_validation` | `true` | Acepta región aunque no exista en AWS |
| `skip_requesting_account_id` | `true` | Evita llamada a STS para obtener account ID |
| `s3_use_path_style` | `true` | LocalStack requiere path-style: `host/bucket/key` |
| `endpoints.s3` | `http://127.0.0.1:4566` | Redirige llamadas S3 a LocalStack |
| `endpoints.sts` | `http://127.0.0.1:4566` | Requerido para `skip_requesting_account_id` |

> **Regla crítica**: Cada servicio que uses DEBE tener su endpoint declarado.
> Sin endpoint, el provider usa el endpoint real de AWS.

---

## 8. Variables estándar

```hcl
# variables.tf
variable "aws_region" {
  description = "Región de referencia del laboratorio."
  type        = string
  default     = "us-east-1"
}

variable "project_prefix" {
  description = "Prefijo para evitar colisiones de nombres."
  type        = string
  default     = "tf-aula"
}
```

---

## 9. Recurso de prueba: Bucket S3

```hcl
# main.tf
resource "aws_s3_bucket" "provider_test" {
  bucket = "${var.project_prefix}-provider-test-001"

  tags = {
    Leccion = "ProviderConfig"
    Entorno = "LocalStack"
  }
}

output "bucket_name" { value = aws_s3_bucket.provider_test.bucket }
output "bucket_arn"  { value = aws_s3_bucket.provider_test.arn }
```

---

## 10. Práctica guiada paso a paso

### Paso 1: Preparar directorio

```bash
mkdir -p provider-config/evidencias
cd provider-config
```

### Paso 2: Crear `compose.yaml` y arrancar LocalStack

```bash
# compose.yaml (sección 6.2)
docker compose up -d
docker compose ps
curl -s http://127.0.0.1:4566/_localstack/health | jq .
source .env.localstack  # o definir aws_local aquí
```

### Paso 3: Crear archivos Terraform

```bash
# versions.tf, providers.tf, variables.tf, main.tf, outputs.tf
```

### Paso 4: Ciclo Terraform

```bash
terraform init
terraform fmt
terraform validate
terraform plan -out=provider.tfplan
terraform show provider.tfplan
terraform apply provider.tfplan
```

### Paso 5: Verificar con `aws_local`

```bash
terraform output
aws_local s3api list-buckets
aws_local s3api head-bucket --bucket $(terraform output -raw bucket_name)
aws_local s3api get-bucket-tagging --bucket $(terraform output -raw bucket_name)
```

### Paso 6: Probar endpoint incompleto (ampliación)

```hcl
# Comentar endpoint STS en providers.tf
# endpoints { s3 = "http://127.0.0.1:4566" }
```

```bash
terraform plan
# Observar: warning o error sobre STS
```

### Paso 7: Alias de provider (ampliación)

```hcl
# Provider por defecto (S3)
provider "aws" {
  # ... configuración estándar
  endpoints { s3 = "http://127.0.0.1:4566" }
}

# Provider alias para SQS (si se usa)
provider "aws" {
  alias  = "sqs"
  region = var.aws_region
  access_key = "test"
  secret_key = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  endpoints { sqs = "http://127.0.0.1:4566" }
}

# Uso en recurso
resource "aws_sqs_queue" "test" {
  provider = aws.sqs
  name     = "test-queue"
}
```

### Paso 8: Limpiar

```bash
terraform plan -destroy -out=destroy.tfplan
terraform apply destroy.tfplan
aws_local s3api list-buckets
docker compose down
```

---

## 11. Sesiones guiadas para el alumnado

### 11.1. Sesión 1: Configuración básica (25 min)

1. Arrancar LocalStack con S3, STS
2. Escribir `providers.tf` completo
3. `terraform init` → `plan` → `apply`
4. Verificar bucket con `aws_local`
5. **Entrega**: `providers.tf` + plan + verificación

### 11.2. Sesión 2: Endpoints y validaciones (20 min)

1. Comentar `endpoints.sts` → `terraform plan` → observar
2. Comentar `s3_use_path_style` → `terraform plan` → observar
3. Quitar `skip_*` → `terraform plan` → observar (puede tardar/fallar)
4. Restaurar configuración completa
5. **Entrega**: Tabla de qué pasa al quitar cada opción

### 11.3. Sesión 3: Alias y módulos (25 min)

1. Añadir provider alias para SQS
2. Crear recurso `aws_sqs_queue` con `provider = aws.sqs`
3. `terraform init` → `plan` → `apply`
4. Verificar cola con `aws_local sqs list-queues`
5. Limpiar todo
6. **Entrega**: Configuración con alias + verificación SQS

---

## 12. Ejercicios de refuerzo

### 12.1. Ejercicio de identificación

Explica la función de:
- `skip_credentials_validation` vs `skip_metadata_api_check`
- `s3_use_path_style = true` vs virtual-hosted style
- `endpoints` mapa vs endpoint por defecto
- Provider alias vs provider por defecto

### 12.2. Ejercicio de diagnóstico

Un compañero tiene este error al hacer `terraform plan`:

```
Error: error validating provider credentials: could not find credentials
```

Su `providers.tf` tiene `access_key = "test"` pero NO tiene `skip_credentials_validation`.
¿Por qué falla? ¿Qué hace `skip_credentials_validation`?

### 12.3. Ejercicio con asistente de IA

```text
Instrucción:
Genera una configuración de provider AWS para LocalStack que use:
- S3, STS, SQS, SNS, DynamoDB
- Credenciales ficticias
- Todas las skip_* necesarias
- s3_use_path_style
Explica cada línea.
No inventes endpoints que no uses.
```

---

## 13. Diferencias: LocalStack vs AWS Real (Provider)

| Aspecto | LocalStack (provider config) | AWS Real (provider config) |
|---------|------------------------------|----------------------------|
| Credenciales | `"test"` / `"test"` | Perfil, env vars, IAM role, SSO |
| `skip_*` | `true` (todas) | `false` / omitidas |
| `endpoints` | Requeridos por servicio | Omitidos (usa endpoints AWS) |
| `s3_use_path_style` | `true` | `false` (default, virtual-hosted) |
| Región | Referencia (`us-east-1`) | Real (afecta latencia, disponibilidad) |
| Validación | Mínima | Completa (IAM, cuotas, límites) |

### 13.1. Configuración AWS Real (referencia)

```hcl
provider "aws" {
  region = "us-east-1"
  # Credenciales via:
  # - ~/.aws/credentials (profile)
  # - AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
  # - IAM Role (EC2, ECS, EKS)
  # - AWS SSO
  # NO skip_*
  # NO endpoints locales
  # NO s3_use_path_style (salvo casos específicos)
}
```

---

## 14. Diagnóstico de errores frecuentes

| Síntoma | Qué comprobar | Qué evitar |
|---------|---------------|------------|
| `connection refused` | LocalStack corriendo, puerto 4566, endpoint correcto | Cambiar a AWS real |
| `InvalidEndpoint` | `endpoints.s3` = `http://127.0.0.1:4566` (con http://) | Usar `localhost` sin esquema |
| `AccessDenied` | Credenciales `test`/`test`, `skip_*` en true | Usar credenciales reales |
| `BucketAlreadyExists` | Nombre único en LocalStack | Reusar nombre sin verificar |
| Provider no descargado | Red, `terraform init`, mirror | Borrar `.terraform` sin diagnosticar |
| SQS/SNS no funciona | Endpoint declarado en provider | Asumir que hereda de S3 |

---

## 15. Evaluación y cierre

### 15.1. Rúbrica (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Provider | Configuración incompleta | Funciona pero faltan opciones | Completa: credenciales, skip_*, endpoints, path_style |
| Endpoints | Solo S3 | S3 + STS | Todos los servicios usados declarados |
| Verificación | Sin `aws_local` | Básica | `aws_local` + state + tags |
| Alias | No probado | Entendido | Configurado y verificado (opcional) |
| Limpieza | No limpia | Parcial | Destroy + list-buckets + compose down |

### 15.2. Checklist final

- [ ] Provider configurado con credenciales ficticias
- [ ] Todas las `skip_*` en `true`
- [ ] `s3_use_path_style = true`
- [ ] Endpoints declarados para TODOS los servicios usados
- [ ] `terraform init` descarga provider correctamente
- [ ] Bucket creado y verificado con `aws_local`
- [ ] Prueba de endpoint faltante (STS) documentada
- [ ] Limpieza completa

### 15.3. Idea principal

> **El provider es el puente; los endpoints son las carreteras.**
> Sin endpoint explícito, el provider va a AWS real.
> **Un servicio sin endpoint = riesgo de fuga a producción.**
