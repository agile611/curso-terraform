# Creación de módulos personalizados con Terraform y LocalStack

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

Un módulo personalizado permite agrupar recursos relacionados y ofrecer una interfaz clara para reutilizarlos.
La utilidad de un módulo no depende de cuántos archivos contiene, sino de qué responsabilidad representa y qué decisiones permite tomar a sus consumidores.

En esta lección construirás un módulo de mensajería con una cola SQS principal y una dead-letter queue opcional.
El módulo definirá entradas, validaciones, recursos, relaciones y salidas.
Después lo utilizarás desde una configuración raíz para desplegar dos componentes con necesidades diferentes.

Terraform gestionará la infraestructura y LocalStack emulará los servicios de AWS utilizados.
Las sesiones incluyen diseño de la interfaz, despliegue, verificación, pruebas, cambios de configuración y limpieza.

---

## 1. Objetivos de aprendizaje

### 1.1. Qué aprenderás

Al finalizar podrás:

- Diferenciar módulo raíz y módulo hijo.
- Diseñar una interfaz de variables (entradas).
- Aplicar tipos, valores predeterminados y validaciones.
- Agrupar recursos relacionados.
- Crear infraestructura opcional (condicional).
- Exponer outputs estables (contrato).
- Heredar la configuración del proveedor.
- Reutilizar un módulo mediante `for_each`.
- Verificar recursos y comportamiento.
- Documentar límites y compatibilidad.

### 1.2. Resultado práctico

Construirás un módulo reutilizable y desplegarás dos colas principales, una DLQ y sus políticas asociadas.

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

Conocimientos: recursos, variables, outputs, `count`, `for_each`, planes guardados, SQS (módulo 05).

---

## 3. Configuración del laboratorio

### 3.1. Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    Equipo Anfitrión (Ubuntu 24.04)         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Módulo Raíz                                         │  │
│  │  ├── main.tf (llama a módulo 2 veces)               │  │
│  │  └── providers.tf (configura proveedor)             │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                 │
│                           ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Módulo Hijo: modules/mensajeria                     │  │
│  │  ├── main.tf (SQS + DLQ + políticas)                │  │
│  │  ├── variables.tf (interfaz)                        │  │
│  │  ├── outputs.tf (contrato)                          │  │
│  │  └── (hereda proveedor del raíz)                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                 │
│                           ▼                                 │
│              http://127.0.0.1:4566 (LocalStack SQS)        │
└─────────────────────────────────────────────────────────────┘
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

## 4. Estructura de un módulo

### 4.1. Directorio del módulo

```
modules/
  mensajeria/
    main.tf          # Recursos
    variables.tf     # Entradas (interfaz)
    outputs.tf       # Salidas (contrato)
    # README.md      # Documentación (opcional)
```

### 4.2. Módulo raíz vs módulo hijo

| Concepto | Módulo Raíz | Módulo Hijo |
|----------|-------------|-------------|
| **Ubicación** | Directorio donde se ejecuta `terraform init` | Subdirectorio `modules/...` |
| **Proveedor** | Configura `provider` | **Hereda** del raíz (no redeclarar) |
| **Estado** | Único (backend del raíz) | Participa en estado del raíz |
| **Invocación** | `terraform init/plan/apply` | `module "nombre" { source = "..." }` |

### 4.3. Regla clave

> **Un módulo hijo participa en la configuración cuando una llamada `module` lo incorpora.**

---

## 5. Diseño de la interfaz (variables.tf)

### 5.1. Principios

- **Tipos explícitos**: `type = string`, `type = map(object({...}))`
- **Valores por defecto sensatos**: `default = ...`
- **Validaciones**: `validation { condition, error_message }`
- **Documentación**: `description = "..."`
- **Sensibles**: `sensitive = true` para secretos

### 5.2. Ejemplo: Interfaz del módulo mensajería

```hcl
# modules/mensajeria/variables.tf

variable "nombre_base" {
  type        = string
  description = "Prefijo para nombres de recursos (ej. 'pedidos', 'notificaciones')"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,60}$", var.nombre_base))
    error_message = "Solo minúsculas, números, guiones. Empieza por letra."
  }
}

variable "crear_dlq" {
  type        = bool
  default     = true
  description = "Si true, crea Dead-Letter Queue y RedrivePolicy"
}

variable "max_receive_count" {
  type        = number
  default     = 3
  description = "Reintentos antes de mover a DLQ (1-1000)"
  validation {
    condition     = var.max_receive_count >= 1 && var.max_receive_count <= 1000
    error_message = "Entre 1 y 1000."
  }
}

variable "visibility_timeout" {
  type        = number
  default     = 30
  description = "Segundos de invisibilidad tras ReceiveMessage (0-43200)"
  validation {
    condition     = var.visibility_timeout >= 0 && var.visibility_timeout <= 43200
    error_message = "Entre 0 y 43200 segundos."
  }
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Tags adicionales para todos los recursos"
}

variable "redrive_allow_policy" {
  type        = bool
  default     = true
  description = "Si true, añade RedriveAllowPolicy a DLQ restringiendo a esta cola"
}
```

---

## 6. Implementación del módulo (main.tf)

```hcl
# modules/mensajeria/main.tf

# 1. DLQ (condicional)
resource "aws_sqs_queue" "dlq" {
  count = var.crear_dlq ? 1 : 0
  name  = "${var.nombre_base}-dlq"
  
  dynamic "redrive_allow_policy" {
    for_each = var.redrive_allow_policy ? [true] : []
    content {
      redrive_permission = "byQueue"
      source_queue_arns  = [aws_sqs_queue.principal[0].arn]
    }
  }
  
  tags = merge({ Nombre = "${var.nombre_base}-dlq" }, var.tags)
}

# 2. Cola Principal
resource "aws_sqs_queue" "principal" {
  name = "${var.nombre_base}-principal"
  visibility_timeout_seconds = var.visibility_timeout
  
  dynamic "redrive_policy" {
    for_each = var.crear_dlq ? [true] : []
    content {
      deadLetterTargetArn = aws_sqs_queue.dlq[0].arn
      maxReceiveCount     = var.max_receive_count
    }
  }
  
  tags = merge({ Nombre = "${var.nombre_base}-principal" }, var.tags)
}
```

---

## 7. Contrato de salidas (outputs.tf)

```hcl
# modules/mensajeria/outputs.tf

output "principal_url" {
  description = "URL de la cola principal"
  value       = var.crear_dlq ? aws_sqs_queue.principal[0].id : aws_sqs_queue.principal[0].id
}

output "principal_arn" {
  description = "ARN de la cola principal"
  value       = aws_sqs_queue.principal[0].arn
}

output "dlq_url" {
  description = "URL de la DLQ (si se creó)"
  value       = var.crear_dlq ? aws_sqs_queue.dlq[0].id : null
}

output "dlq_arn" {
  description = "ARN de la DLQ (si se creó)"
  value       = var.crear_dlq ? aws_sqs_queue.dlq[0].arn : null
}

output "tiene_dlq" {
  description = "Indica si el módulo creó DLQ"
  value       = var.crear_dlq
}
```

---

## 8. Módulo raíz: invocación y composición

### 8.1. Estructura del proyecto

```
practica-modulos/
├── main.tf           # Módulo raíz: llama a módulo hijo
├── providers.tf      # Configura proveedor
├── variables.tf      # Variables del raíz
└── modules/
    └── mensajeria/   # Módulo hijo
        ├── main.tf
        ├── variables.tf
        └── outputs.tf
```

### 8.2. Configuración raíz

```hcl
# practica-modulos/providers.tf
terraform {
  required_version = ">= 1.6.0, < 2.0.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = "us-east-1"
  access_key = "test"
  secret_key = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_region_validation      = true
  skip_requesting_account_id  = true
  endpoints { sqs = "http://127.0.0.1:4566", sts = "http://127.0.0.1:4566" }
}
```

```hcl
# practica-modulos/main.tf

# Variables del raíz
variable "entorno" { type = string, default = "dev" }

locals {
  tags_comunes = { Entorno = var.entorno, Practica = "Modulos" }
}

# 1. Instancia 1: Cola de pedidos (con DLQ)
module "cola_pedidos" {
  source = "./modules/mensajeria"
  nombre_base = "pedidos"
  crear_dlq = true
  max_receive_count = 5
  tags = merge(local.tags_comunes, { Componente = "pedidos" })
}

# 2. Instancia 2: Cola de notificaciones (sin DLQ)
module "cola_notificaciones" {
  source = "./modules/mensajeria"
  nombre_base = "notificaciones"
  crear_dlq = false
  tags = merge(local.tags_comunes, { Componente = "notificaciones" })
}

# 3. Instancia 3: Cola de auditoría (con DLQ, config distinta)
module "cola_auditoria" {
  source = "./modules/mensajeria"
  nombre_base = "auditoria"
  crear_dlq = true
  max_receive_count = 10
  visibility_timeout = 60
  tags = merge(local.tags_comunes, { Componente = "auditoria" })
}

# Outputs del raíz
output "pedidos_principal_url" { value = module.cola_pedidos.principal_url }
output "pedidos_dlq_url"       { value = module.cola_pedidos.dlq_url }
output "notificaciones_url"    { value = module.cola_notificaciones.principal_url }
output "auditoria_principal_url" { value = module.cola_auditoria.principal_url }
output "auditoria_dlq_url"     { value = module.cola_auditoria.dlq_url }
```

---

## 9. Práctica guiada paso a paso

### Paso 1: Preparar estructura

```bash
mkdir -p practica-modulos/modules/mensajeria
cd practica-modulos
docker compose up -d
curl -s http://127.0.0.1:4566/_localstack/health | jq .
source .env.localstack
```

### Paso 2: Crear módulo hijo

```bash
# En modules/mensajeria/
# Crear: variables.tf, main.tf, outputs.tf (secciones 5, 6, 7)
```

### Paso 3: Crear módulo raíz

```bash
# En practica-modulos/
# Crear: providers.tf, main.tf (sección 8)
```

### Paso 4: Desplegar

```bash
cd practica-modulos
terraform init
terraform fmt -recursive
terraform validate
terraform plan -out=modulos.tfplan
terraform show modulos.tfplan
# Verificar: 3 instancias del módulo, 2 con DLQ, 1 sin DLQ

terraform apply modulos.tfplan
```

### Paso 5: Verificar con aws_local

```bash
aws_local sqs list-queues
# Debe mostrar 5 colas: 3 principales + 2 DLQ

aws_local sqs get-queue-attributes --queue-url $(terraform output -raw pedidos_principal_url) --attribute-names All
aws_local sqs get-queue-attributes --queue-url $(terraform output -raw notificaciones_url) --attribute-names All
aws_local sqs get-queue-attributes --queue-url $(terraform output -raw auditoria_principal_url) --attribute-names All

# Verificar RedrivePolicy en pedidos y auditoria
aws_local sqs get-queue-attributes --queue-url $(terraform output -raw pedidos_principal_url) --attribute-names RedrivePolicy
aws_local sqs get-queue-attributes --queue-url $(terraform output -raw auditoria_principal_url) --attribute-names RedrivePolicy
```

### Paso 6: Probar funcionalidad

```bash
# Publicar en cola pedidos
aws_local sqs send-message --queue-url $(terraform output -raw pedidos_principal_url) --message-body '{"pedido": 123}'

# Recibir y procesar
aws_local sqs receive-message --queue-url $(terraform output -raw pedidos_principal_url) --max-number-of-messages 1

# Simular fallo 5 veces (maxReceiveCount=5) para DLQ
for i in 1 2 3 4 5; do
  aws_local sqs receive-message --queue-url $(terraform output -raw pedidos_principal_url) --max-number-of-messages 1
  sleep 1
done

# Verificar DLQ de pedidos
aws_local sqs receive-message --queue-url $(terraform output -raw pedidos_dlq_url) --max-number-of-messages 1
```

### Paso 7: Cambios y reutilización

```bash
# Cambiar configuración de una instancia
# En main.tf raíz, modificar module "cola_pedidos": max_receive_count = 10
terraform plan -out=cambio.tfplan
terraform apply cambio.tfplan

# Verificar cambio solo en esa instancia
aws_local sqs get-queue-attributes --queue-url $(terraform output -raw pedidos_principal_url) --attribute-names RedrivePolicy
```

### Paso 8: Limpiar

```bash
terraform destroy -auto-approve
aws_local sqs list-queues
docker compose down
```

---

## 10. Sesiones guiadas

### 10.1. Sesión 1: Diseño e implementación del módulo (35 min)

1. Crear directorio `modules/mensajeria/`
2. Escribir `variables.tf` con validaciones
3. Escribir `main.tf` con recursos condicionales (`count`, `dynamic`)
4. Escribir `outputs.tf` con contrato estable
5. **Entrega**: Módulo completo + explicación interfaz

### 10.2. Sesión 2: Composición en raíz (30 min)

1. Crear raíz con `providers.tf` y `main.tf`
2. Invocar módulo 3 veces con configs distintas
3. `init` → `plan` → `apply`
4. **Entrega**: Raíz + 3 instancias + verificación

### 10.3. Sesión 3: Pruebas, cambios y limpieza (25 min)

1. Probar colas: publicar, recibir, DLQ
2. Cambiar config de una instancia → `plan` → `apply`
3. `destroy` → limpiar
5. **Entrega**: Evidencia pruebas + cambio + limpieza

---

## 11. Ejercicios de refuerzo

### 11.1. Ejercicio de identificación

Diferencia entre:
- `source = "./modules/mensajeria"` vs `source = "github.com/usuario/modulo"`
- Variable en módulo raíz vs variable en módulo hijo
- `output` en módulo hijo vs `output` en módulo raíz
- `provider` en raíz vs `provider` en hijo

### 11.2. Ejercicio de interpretación

Un módulo hijo declara `variable "x" { type = string }`.
El raíz lo invoca: `module "m" { source = "./mod" }` (sin pasar `x`).
¿Qué pasa en `plan`? ¿Y si la variable tiene `default`?

### 11.3. Ejercicio con asistente de IA

```text
Instrucción:
Genera un módulo "bucket-versionado" que cree:
- Bucket S3 con versionado habilitado
- Lifecycle rule para expirar versiones no actuales a 90 días
- Variables: nombre_bucket, habilitar_versionado (bool, default true), dias_expiracion (default 90)
- Outputs: bucket_name, bucket_arn, versionado_habilitado
Incluye: validaciones, tags, outputs con descripción.
```

---

## 12. Limitaciones LocalStack en módulos

| Característica | LocalStack | AWS Real |
|----------------|------------|----------|
| Módulos locales | ✅ Idéntico | ✅ |
| Módulos remotos (Git, S3, Registry) | ✅ | ✅ |
| `count`/`for_each` en `module` | ✅ | ✅ |
| `moved` blocks | ✅ | ✅ |
| Proveedor heredado | ✅ | ✅ |

---

## 13. Diagnóstico de errores frecuentes

| Error | Causa | Solución |
|-------|-------|----------|
| `Module not found` | Ruta `source` incorrecta | Verificar ruta relativa desde raíz |
| `Provider not configured` | Hijo declara `provider` | Quitar `provider` del hijo, hereda del raíz |
| `Variable not found` | Falta variable requerida | Pasar variable en `module` o añadir `default` |
| `Output not found` | Nombre incorrecto en raíz | Usar `module.nombre.output` |
| `count` en módulo | `count` no soportado en `module` (Terraform < 1.3) | Usar `for_each` o Terraform 1.3+ |

---

## 14. Evaluación y cierre

### 14.1. Rúbrica (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Estructura módulo | No crea | Crea sin interfaz | Variables + validaciones + outputs |
| Interfaz | Sin tipos/validaciones | Básica | Tipos + validaciones + defaults + sensitive |
| Recursos | No agrupa | Agrupa básicos | Condicionales + dynamic + tags |
| Contrato (outputs) | Sin outputs | Básicos | Estables + descripciones + nulls condicionales |
| Composición raíz | No invoca | 1 instancia | Múltiples + configs distintas + verificación |

### 14.2. Checklist final

- [ ] Directorio `modules/mensajeria/` con `variables.tf`, `main.tf`, `outputs.tf`
- [ ] Variables con `type`, `description`, `validation`, `default`
- [ ] Recursos condicionales (`count` para DLQ)
- [ ] `dynamic` para políticas (`redrive_policy`, `redrive_allow_policy`)
- [ ] Outputs con `description` y valores condicionales
- [ ] Raíz con `providers.tf` y `main.tf` invocando módulo 3 veces
- [ ] 3 instancias con configs distintas (DLQ sí/no, params distintos)
- [ ] Verificación: `aws_local` confirma colas, DLQ, RedrivePolicy
- [ ] Cambio en una instancia → `plan` → `apply` solo esa instancia
- [ ] `terraform destroy` limpia todo

### 14.3. Idea principal

> **Módulo = responsabilidad encapsulada + interfaz explícita.**
> Raíz orquesta, hijo implementa. Proveedor se hereda, estado es único.
> **Interfaz = variables (entradas) + outputs (salidas). Valida, documenta, versiona.**
> **`for_each` en `module` = múltiples instancias con configs distintas.**
> **Módulo bien diseñado = reutilizable, testeable, evolucionable.**
