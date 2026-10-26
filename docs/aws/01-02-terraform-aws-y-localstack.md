# Terraform, AWS y LocalStack: configuración, ejecución y verificación de laboratorios locales

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

Terraform permite describir infraestructura mediante archivos de configuración.
AWS proporciona las APIs y los servicios que utilizaremos como referencia.
LocalStack ofrece un entorno de emulación para practicar determinados comportamientos de esas APIs.
En esta lección aprenderás a conectar los tres componentes sin confundir sus responsabilidades.

El laboratorio principal crea un bucket S3 y consulta sus propiedades.
Después introduce cambios controlados, comprobaciones independientes y una limpieza revisada.
Las sesiones propuestas combinan trabajo individual, revisión por parejas y documentación de resultados.

La prioridad no es ejecutar muchos comandos.
La prioridad es comprender qué se solicita, dónde se ejecuta y cómo se comprueba.
Cada operación debe tener una intención clara y una evidencia observable.

---

## 1. Objetivos de aprendizaje

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Diferenciar Terraform, el provider de AWS y LocalStack.
- Explicar cómo se selecciona un endpoint.
- Distinguir una región de referencia de una región real de ejecución.
- Diferenciar configuración, estado y recursos observados.
- Reconocer los límites de un laboratorio emulado.

### 1.2. Objetivos prácticos

También podrás:

- Preparar un proyecto reproducible.
- Arrancar LocalStack mediante Docker Compose.
- Configurar Terraform con credenciales ficticias.
- Crear un bucket S3 local.
- Consultar el recurso mediante una segunda herramienta.
- Aplicar cambios después de revisar un plan.
- Limpiar el laboratorio sin borrar evidencias necesarias.

### 1.3. Resultado esperado

Entregarás una configuración funcional y un registro de práctica.
El registro distinguirá acciones propuestas, ejecutadas y verificadas.
También incluirá las versiones utilizadas y las limitaciones pendientes.

---

## 2. Alcance y condiciones del laboratorio

El ejercicio está deliberadamente limitado para facilitar su comprensión.

### 2.1. Servicios utilizados

Trabajaremos únicamente con:

- S3 como servicio principal.
- STS como endpoint auxiliar configurado.
- Terraform CLI.
- El provider `hashicorp/aws`.
- LocalStack dentro de Docker.
- AWS CLI para comprobaciones independientes (vía `aws_local`).

### 2.2. Arquitectura asumida

Terraform y AWS CLI se ejecutan en el equipo anfitrión (Ubuntu 24.04).
LocalStack se ejecuta en un contenedor Docker.
Su puerto se publica en la interfaz de bucle local.
La dirección utilizada será `http://127.0.0.1:4566`.

### 2.3. Exclusiones

No se incluyen recursos EC2, redes VPC ni bases de datos.
No se configura un backend remoto.
No se utiliza un workspace para separar entornos.
No se reproducen políticas corporativas de seguridad.
No se ejecutan operaciones sobre AWS real.

### 2.4. Regla de ampliación

Añadir un servicio exige revisar su endpoint y su compatibilidad.
No copies recursos de otra lección suponiendo que todas las llamadas serán locales.

---

## 3. Requisitos previos

### 3.1. Conocimientos necesarios

Debes saber:

- Crear y editar archivos.
- Abrir una terminal.
- Cambiar de directorio.
- Interpretar mensajes de error básicos.
- Diferenciar un archivo de un proceso.
- Identificar un puerto y una dirección local.

### 3.2. Herramientas necesarias

Instala o utiliza un entorno autorizado con:

- Terraform CLI compatible con las restricciones del proyecto (>= 1.6, < 2.0).
- Docker Engine o Docker Desktop.
- Docker Compose con el comando `docker compose`.
- AWS CLI v2.
- `curl`.
- Un editor de texto.

### 3.3. Entorno de comandos

Los ejemplos de terminal utilizan Bash.
En Windows puedes emplear WSL o un entorno equivalente autorizado.
No pegues funciones Bash directamente en PowerShell.
Las rutas y las reglas de permisos pueden variar entre sistemas.

### 3.4. Recomendación docente

El docente debe probar la combinación de herramientas antes de la sesión.
El alumnado debe registrar la combinación que realmente utiliza.

---

## 4. Configuración del laboratorio (Ubuntu 24.04 + Docker + LocalStack)

### 4.1. Arquitectura del laboratorio

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
│  │  │  Bucket S3 para practicar el ciclo completo    │   │  │
│  │  └────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 4.2. `compose.yaml` estándar

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

### 4.3. Función `aws_local` (Herramienta principal de verificación)

```bash
# Definir al inicio de cada sesión de terminal
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

# Para persistir entre sesiones:
cat > .env.localstack <<'EOF'
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
EOF

source .env.localstack
```

### 4.4. Configuración del Provider AWS para LocalStack

```hcl
# providers.tf
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

### 4.5. Variables estándar del laboratorio

```hcl
# variables.tf
variable "aws_region" {
  description = "Región de referencia del laboratorio local."
  type        = string
  default     = "us-east-1"
}

variable "project_prefix" {
  description = "Prefijo para nombres de recursos (evita colisiones)."
  type        = string
  default     = "tf-aula"
}

variable "bucket_name" {
  description = "Nombre del bucket S3 de práctica."
  type        = string
  default     = "tf-aula-localstack-001"

  validation {
    condition = can(regex(
      "^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$",
      var.bucket_name
    ))
    error_message = "Usa entre 3 y 63 caracteres: minúsculas, números y guiones."
  }
}
```

---

## 5. Diferencias clave: LocalStack (aws_local) vs AWS Real

| Aspecto | LocalStack (aws_local) | AWS Real |
|---------|------------------------|----------|
| **Credenciales** | `test` / `test` (ficticias) | IAM reales (Access Key, Secret Key, Session Token) |
| **Endpoint** | `http://127.0.0.1:4566` | Endpoints regionales de AWS (ej. `s3.us-east-1.amazonaws.com`) |
| **Región** | `us-east-1` (referencia) | Región real con disponibilidad de servicios |
| **Costes** | Recursos locales (CPU, RAM, disco) | Facturación por uso (requests, almacenamiento, transferencia) |
| **IAM/Permisos** | Simplificado / No estricto | Políticas IAM completas, conditions, boundaries |
| **Durabilidad** | En memoria / Volumen Docker (no garantizado) | 99.999999999% (S3), SLAs contractuales |
| **Límites/Cuotas** | Limitados por recursos del host | Cuotas de servicio AWS (soft/hard limits) |
| **Latencia** | Local (sub-ms) | Red (ms, variable por región) |
| **Servicios** | Subconjunto (ver edición LocalStack) | 200+ servicios completos |
| **Validación** | Sintaxis básica | Validación completa (naming, policies, etc.) |

### 5.1. Limitaciones conocidas de `aws_local` / LocalStack

> ⚠️ **Importante**: Documenta siempre qué operaciones probaste y bajo qué condiciones.

- **IAM**: Políticas complejas, conditions, boundaries no se evalúan igual
- **KMS/Cifrado**: Operaciones de cifrado pueden ser simuladas o no disponibles
- **CloudFormation/Stacks**: No soportado completamente
- **Organizations/SCPs**: No disponible
- **EventBridge/Eventos avanzados**: Cobertura parcial
- **Lambda**: Requiere Docker montado (`/var/run/docker.sock`), cold starts diferentes
- **API Gateway**: Solo HTTP API / REST API básico, sin custom domains, WAF, etc.
- **DynamoDB**: Transacciones, TTL, streams pueden tener comportamiento diferente
- **S3**: Versionado, replicación, Object Lock, Access Points - cobertura variable

### 5.2. Cómo se haría en AWS Real (Referencia)

```bash
# En AWS real NO se usa aws_local, se usa AWS CLI configurado con credenciales reales:
aws configure  # Configura access key, secret key, region

# O usando variables de entorno / perfil:
export AWS_PROFILE=mi-perfil-produccion
aws s3api list-buckets --region us-east-1

# Terraform en AWS real:
provider "aws" {
  region = "us-east-1"
  # Credenciales via ~/.aws/credentials, variables de entorno, o IAM role
  # NO se configuran endpoints locales
  # NO se usan skip_* validations
}
```

---

## 6. Práctica guiada paso a paso

### Paso 1: Preparar el directorio

```bash
mkdir -p terraform-aws-localstack/evidencias
cd terraform-aws-localstack
```

### Paso 2: Crear archivos de configuración

```hcl
# versions.tf
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

```hcl
# providers.tf
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

```hcl
# variables.tf
variable "aws_region" {
  description = "Región de referencia del laboratorio local."
  type        = string
  default     = "us-east-1"
}

variable "bucket_name" {
  description = "Nombre del bucket S3 de práctica."
  type        = string
  default     = "tf-aula-localstack-001"

  validation {
    condition = can(regex(
      "^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$",
      var.bucket_name
    ))
    error_message = "Usa entre 3 y 63 caracteres: minúsculas, números y guiones."
  }
}
```

```hcl
# main.tf
resource "aws_s3_bucket" "laboratorio" {
  bucket        = var.bucket_name
  force_destroy = false

  tags = {
    Curso   = "Terraform"
    Entorno = "LocalStack"
    Leccion = "TerraformAWSLocalStack"
  }
}
```

```hcl
# outputs.tf
output "bucket_name" {
  description = "Nombre del bucket gestionado."
  value       = aws_s3_bucket.laboratorio.bucket
}

output "bucket_arn" {
  description = "ARN informado para el bucket."
  value       = aws_s3_bucket.laboratorio.arn
}

output "s3_endpoint" {
  description = "Endpoint local utilizado en esta práctica."
  value       = "http://127.0.0.1:4566"
}
```

```gitignore
# .gitignore
.terraform/
*.tfstate
*.tfstate.*
*.tfplan
*.tfvars
*.tfvars.json
crash.log
crash.*.log
override.tf
override.tf.json
*_override.tf
*_override.tf.json
```

### Paso 3: Inicializar y validar

```bash
terraform init
terraform fmt
terraform validate
```

### Paso 4: Planificar y revisar

```bash
terraform plan -out=creacion.tfplan
terraform show creacion.tfplan
# Revisar el plan ANTES de aplicar
```

### Paso 5: Aplicar

```bash
terraform apply creacion.tfplan
```

### Paso 6: Verificar con aws_local (verificación independiente)

```bash
aws_local s3api list-buckets
aws_local s3api head-bucket --bucket tf-aula-localstack-001
aws_local s3api get-bucket-tagging --bucket tf-aula-localstack-001
```

### Paso 7: Modificación controlada y convergencia

```hcl
# En main.tf, modificar tags:
tags = {
  Curso   = "Terraform"
  Entorno = "LocalStack"
  Leccion = "TerraformAWSLocalStack"
  Practica = "CambioControlado"
}
```

```bash
terraform fmt
terraform validate
terraform plan -out=etiquetas.tfplan
terraform show etiquetas.tfplan
terraform apply etiquetas.tfplan
```

### Paso 8: Verificar convergencia

```bash
terraform plan
# No changes. Infrastructure is up-to-date.

aws_local s3api get-bucket-tagging --bucket tf-aula-localstack-001
```

### Paso 9: Drift y detección

```bash
# Modificación externa (drift)
aws_local s3api put-bucket-tagging \
  --bucket tf-aula-localstack-001 \
  --tagging '{"TagSet":[{"Key":"Entorno","Value":"CambioExterno"}]}'

# Detectar drift
terraform plan
# Muestra: ~ tags.Entorno será actualizado a "LocalStack"
```

### Paso 10: Limpiar

```bash
terraform plan -destroy -out=limpieza.tfplan
terraform show limpieza.tfplan
terraform apply limpieza.tfplan
aws_local s3api list-buckets  # Verificar limpieza
docker compose down
```

---

## 7. Sesiones guiadas para el alumnado

### 7.1. Sesión A: preparar y explicar (25 min)

1. Comprueba herramientas y versiones.
2. Arranca LocalStack.
3. Consulta S3 mediante `aws_local`.
4. Dibuja el recorrido de una solicitud.
5. Registra el endpoint y las limitaciones.

Entrega el diagrama y dos evidencias de disponibilidad.

### 7.2. Sesión B: crear y verificar (40 min)

1. Escribe los archivos Terraform.
2. Inicializa, formatea y valida.
3. Interpreta el plan.
4. Aplica tras una revisión por parejas.
5. Comprueba el bucket desde AWS CLI (`aws_local`).

Entrega el código y una explicación de cada evidencia.

### 7.3. Sesión C: modificar y limpiar (30 min)

Modifica etiquetas, revisa el plan y comprueba el cambio.
Después elimina objetos opcionales, destruye el bucket y verifica la limpieza.
Entrega un registro que distinga actualización, destrucción y detención del servicio.

---

## 8. Ejercicios de refuerzo y revisión

### 8.1. Ejercicio de identificación

Explica la función de:

- `required_providers`.
- `endpoints`.
- `s3_use_path_style`.
- `.terraform.lock.hcl`.
- `terraform state list`.

### 8.2. Ejercicio de aislamiento

Un compañero añade un recurso EC2 a esta configuración.
Identifica por qué no debe ejecutarlo todavía.
Explica qué revisiones faltan antes de ampliar el laboratorio.

### 8.3. Ejercicio de interpretación

Compara cambiar una etiqueta con cambiar el nombre del bucket.
Genera planes por separado.
No apliques el reemplazo.
Documenta la diferencia observada.

### 8.4. Ejercicio con asistente de IA

Utiliza un fragmento ficticio y esta instrucción:

```text
Explica las operaciones del plan para un estudiante principiante.
No ejecutes acciones ni inventes atributos desconocidos.
Distingue Terraform, AWS y LocalStack.
Indica qué comprobaciones humanas faltan antes de aplicar.
```

Verifica la explicación contra el plan.

---

## 9. Diagnóstico de errores frecuentes

| Síntoma | Qué comprobar | Qué evitar |
|---------|---------------|------------|
| Conexión rechazada | Contenedor y puerto | Cambiar a AWS real |
| Puerto ocupado | Procesos y contenedores | Detener servicios ajenos |
| Error de descarga | Red y restricciones | Borrar todos los archivos |
| Nombre rechazado | Variable y reglas S3 | Inventar otra causa |
| Bucket no vacío | Objetos existentes | Forzar sin revisar |
| Recurso inesperado | Directorio y estado | Aplicar automáticamente |

---

## 10. Evaluación, resumen y cierre

### 10.1. Rúbrica de la práctica

Valora cada criterio entre cero y dos puntos.

| **Criterio** | **0 puntos** | **1 punto** | **2 puntos** |
|-------------|--------------|-------------|-------------|
| Configuración | No operativa | Requiere ajustes | Cumple el laboratorio |
| Interpretación | No explica cambios | Explicación parcial | Explicación fundamentada |
| Verificación | Sin evidencias | Evidencias incompletas | Comprobaciones independientes |
| Seguridad | Incumple límites | Cumplimiento parcial | Respeta los controles |
| Documentación | No reproducible | Faltan detalles | Permite repetir la práctica |

Una puntuación alta no compensa una ejecución no autorizada.
La exposición de secretos debe tratarse como un fallo crítico.

### 10.2. Lista final

- Utilicé credenciales ficticias.
- Confirmé los endpoints locales.
- Revisé los planes antes de aplicar.
- Consulté el recurso desde AWS CLI (`aws_local`).
- Documenté las versiones y las limitaciones.
- Verifiqué la limpieza antes de detener LocalStack.

### 10.3. Idea principal

Terraform describe y gestiona; el provider conecta; LocalStack emula.
La calidad del trabajo depende de comprender y comprobar cada paso.
**Escribe, revisa, aplica, verifica y documenta.**
