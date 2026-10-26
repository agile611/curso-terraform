# Título de la Lección

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

Breve introducción explicando el objetivo de la lección, qué se va a construir y qué se va a aprender.

---

## 1. Objetivos de aprendizaje

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Concepto 1
- Concepto 2
- Concepto 3

### 1.2. Objetivos prácticos

También podrás:

- Habilidad práctica 1
- Habilidad práctica 2
- Habilidad práctica 3

### 1.3. Resultado esperado / Evidencia final

Descripción de lo que el alumno debe entregar: código, evidencias, registros, etc.

---

## 2. Alcance de la lección

### 2.1. Componentes principales

- Qué recursos/servicios se van a utilizar
- Qué herramientas se van a usar

### 2.2. Exclusiones

- Qué NO se va a hacer en esta lección
- Limitaciones importantes

---

## 3. Requisitos previos

### 3.1. Conocimientos necesarios

- Conocimiento 1
- Conocimiento 2

### 3.2. Herramientas necesarias

```bash
terraform version
docker version
docker compose version
aws --version
# Otras herramientas específicas
```

### 3.3. Comprobaciones iniciales

Comandos para verificar que el entorno está listo.

---

## 4. Versiones y compatibilidad

### 4.1. Base didáctica

- Terraform: >= 1.6, < 2.0
- Provider AWS: ~> 5.0
- LocalStack: [versión específica probada por el docente]

### 4.2. Registro del entorno

El alumno debe documentar:
- Versión de Terraform CLI
- Versión efectiva del provider (desde `.terraform.lock.hcl`)
- Imagen y digest de LocalStack
- Docker y Docker Compose
- AWS CLI
- Sistema operativo y arquitectura

### 4.3. Regla de actualizaciones

No actualices herramientas a mitad de una práctica sin registrar el cambio y repetir las comprobaciones.

---

## 5. Configuración del laboratorio (Ubuntu 24.04 + Docker + LocalStack)

### 5.1. Arquitectura del laboratorio

```
┌─────────────────────────────────────────────────────────────┐
│                    Equipo Anfitrión (Ubuntu 24.04)         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Terraform  │  │   AWS CLI    │  │   aws_local()    │  │
│  │   (gestión)  │  │  (verificación)│  │  (wrapper CLI)   │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                     │           │
│         └─────────────────┼─────────────────────┘           │
│                           ▼                                 │
│              http://localhost:4566                          │
│                           │                                 │
│                           ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Docker Container: LocalStack             │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐               │  │
│  │  │   S3    │  │   STS   │  │  SQS    │  ...          │  │
│  │  └─────────┘  └─────────┘  └─────────┘               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 5.2. Archivo `compose.yaml` estándar

```yaml
services:
  localstack:
    image: localstack/localstack:3.7.0  # Usar versión probada por el curso
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: s3,sts,sqs,sns,dynamodb,lambda,apigateway
      AWS_DEFAULT_REGION: us-east-1
      DEBUG: "1"
    volumes:
      - localstack_data:/var/lib/localstack
      - /var/run/docker.sock:/var/run/docker.sock

volumes:
  localstack_data:
```

### 5.3. Función `aws_local` (Herramienta principal de verificación)

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
    --endpoint-url http://localhost:4566 \
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
    --endpoint-url http://localhost:4566 \
    --region us-east-1 \
    --no-cli-pager \
    "$@"
}
export -f aws_local
EOF

source .env.localstack
```

### 5.4. Configuración del Provider AWS para LocalStack

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
    s3  = "http://localhost:4566"
    sts = "http://localhost:4566"
    # Añadir más endpoints según servicios utilizados:
    # sqs     = "http://localhost:4566"
    # sns     = "http://localhost:4566"
    # dynamodb = "http://localhost:4566"
    # lambda  = "http://localhost:4566"
    # apigateway = "http://localhost:4566"
  }
}
```

### 5.5. Variables estándar del laboratorio

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
```

---

## 6. Diferencias clave: LocalStack (aws_local) vs AWS Real

| Aspecto | LocalStack (aws_local) | AWS Real |
|---------|------------------------|----------|
| **Credenciales** | `test` / `test` (ficticias) | IAM reales (Access Key, Secret Key, Session Token) |
| **Endpoint** | `http://localhost:4566` | Endpoints regionales de AWS (ej. `s3.us-east-1.amazonaws.com`) |
| **Región** | `us-east-1` (referencia) | Región real con disponibilidad de servicios |
| **Costes** | Recursos locales (CPU, RAM, disco) | Facturación por uso (requests, almacenamiento, transferencia) |
| **IAM/Permisos** | Simplificado / No estricto | Políticas IAM completas, condiciones, boundaries |
| **Durabilidad** | En memoria / Volumen Docker (no garantizado) | 99.999999999% (S3), SLAs contractuales |
| **Límites/Cuotas** | Limitados por recursos del host | Cuotas de servicio AWS (soft/hard limits) |
| **Latencia** | Local (sub-ms) | Red (ms, variable por región) |
| **Servicios** | Subconjunto (ver edición LocalStack) | 200+ servicios completos |
| **Validación** | Sintaxis básica | Validación completa (naming, policies, etc.) |

### 6.1. Limitaciones conocidas de `aws_local` / LocalStack

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

### 6.2. Cómo se haría en AWS Real (Referencia)

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

## 7. Contenido principal de la lección

### 7.1. Sección conceptual

Explicación teórica con diagramas, tablas, comparativas.

### 7.2. Práctica guiada paso a paso

#### Paso 1: Preparar el directorio

```bash
mkdir -p nombre-leccion/evidencias
cd nombre-leccion
```

#### Paso 2: Crear archivos de configuración

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

#### Paso 3: Inicializar y validar

```bash
terraform init
terraform fmt
terraform validate
```

#### Paso 4: Planificar y revisar

```bash
terraform plan
# Revisar el plan ANTES de aplicar
```

#### Paso 5: Aplicar

```bash
terraform apply
```

#### Paso 6: Verificar con aws_local (verificación independiente)

```bash
aws_local s3api list-buckets
aws_local s3api head-bucket --bucket nombre-bucket
```

#### Paso 7: Limpiar

```bash
terraform plan -destroy
terraform destroy
aws_local s3api list-buckets  # Verificar limpieza
docker compose down
```

---

## 8. Sesiones guiadas para el alumnado

### 8.1. Sesión 1: Preparación y comprensión (XX min)

1. Verificar herramientas y versiones
2. Arrancar LocalStack y comprobar salud
3. Definir y probar `aws_local`
4. Dibujar arquitectura y flujo de solicitudes
5. **Entrega**: Diagrama + 2 evidencias de disponibilidad

### 8.2. Sesión 2: Construcción y verificación (XX min)

1. Escribir configuración Terraform
2. Inicializar, formatear, validar
3. Interpretar plan en parejas
4. Aplicar tras revisión
5. Verificar con `aws_local`
6. **Entrega**: Código + explicación de evidencias

### 8.3. Sesión 3: Modificación, drift y limpieza (XX min)

1. Modificar configuración (etiquetas, etc.)
2. Revisar plan y aplicar
3. Verificar convergencia (`terraform plan` sin cambios)
4. Introducir drift externo con `aws_local` y detectarlo
5. Limpiar recursos y detener LocalStack
6. **Entrega**: Registro distinguido (actualización, drift, destrucción, detención)

---

## 9. Ejercicios de refuerzo

### 9.1. Ejercicio de identificación

Explica la función de: [conceptos clave de la lección]

### 9.2. Ejercicio de interpretación

Compara [escenario A] vs [escenario B]. Genera planes, no apliques. Documenta diferencias.

### 9.3. Ejercicio con asistente de IA

```text
Instrucción para el asistente:
Explica las operaciones del plan para un estudiante principiante.
No ejecutes acciones ni inventes atributos desconocidos.
Distingue Terraform, AWS y LocalStack.
Indica qué comprobaciones humanas faltan antes de aplicar.
```

Verifica la explicación contra el plan real.

---

## 10. Diagnóstico de errores frecuentes

| Síntoma | Qué comprobar | Qué evitar |
|---------|---------------|------------|
| Conexión rechazada | Contenedor, puerto 4566, Docker | Cambiar a AWS real |
| Puerto ocupado | `lsof -i :4566`, otros contenedores | Matar procesos ajenos sin verificar |
| Error descarga provider | Red, proxy, mirror | Borrar `.terraform` sin más |
| Nombre recurso rechazado | Validación variable, reglas servicio | Inventar causa sin leer error |
| Recurso no vacío | Objetos/versiones existentes | Forzar `force_destroy` sin revisar |
| Drift inesperado | Estado vs API, cambios externos | Aplicar automáticamente sin analizar |

---

## 11. Evaluación y cierre

### 11.1. Rúbrica (0-2 puntos por criterio)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Configuración | No operativa | Requiere ajustes | Cumple laboratorio |
| Interpretación | No explica cambios | Explicación parcial | Explicación fundamentada |
| Verificación | Sin evidencias | Evidencias incompletas | Comprobaciones independientes |
| Seguridad | Incumple límites | Cumplimiento parcial | Respeta controles |
| Documentación | No reproducible | Faltan detalles | Permite repetir práctica |

### 11.2. Checklist final

- [ ] Utilicé credenciales ficticias (`test`/`test`)
- [ ] Confirmé endpoints locales (`http://localhost:4566`)
- [ ] Revisé planes antes de aplicar
- [ ] Consulté recursos desde `aws_local` (verificación independiente)
- [ ] Documenté versiones y limitaciones
- [ ] Verifiqué limpieza ANTES de detener LocalStack
- [ ] No mezclé configuración local con real

### 11.3. Idea principal

> **Terraform describe y gestiona; el provider conecta; LocalStack emula.**
> La calidad del trabajo depende de comprender y comprobar cada paso.
> **Escribe, revisa, aplica, verifica y documenta.**