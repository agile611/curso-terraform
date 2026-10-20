# Creación de módulos personalizados con Terraform y LocalStack

Un módulo personalizado permite agrupar recursos relacionados y ofrecer una interfaz clara para reutilizarlos.

La utilidad de un módulo no depende de cuántos archivos contiene, sino de qué responsabilidad representa y qué decisiones permite tomar a sus consumidores.

En esta lección construirás un módulo de mensajería con una cola SQS principal y una dead-letter queue opcional.

El módulo definirá entradas, validaciones, recursos, relaciones y salidas.

Después lo utilizarás desde una configuración raíz para desplegar dos componentes con necesidades diferentes.

Terraform gestionará la infraestructura y LocalStack emulará los servicios de AWS utilizados.

Las sesiones incluyen diseño de la interfaz, despliegue, verificación, pruebas, cambios de configuración y limpieza.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> El módulo es una base didáctica y no constituye una solución completa de mensajería para producción.

---

## 1. Objetivos de aprendizaje

Esta lección desarrolla un procedimiento reproducible para diseñar y utilizar módulos propios.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Diferenciar módulo raíz y módulo hijo.
- Diseñar una interfaz de variables.
- Aplicar tipos, valores predeterminados y validaciones.
- Agrupar recursos relacionados.
- Crear infraestructura opcional.
- Exponer outputs estables.
- Heredar la configuración del proveedor.
- Reutilizar un módulo mediante `for_each`.
- Verificar recursos y comportamiento.
- Documentar límites y compatibilidad.

### 1.2. Resultado práctico

Construirás un módulo reutilizable y desplegarás dos colas principales, una DLQ y sus políticas asociadas.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos básicos de Terraform, SQS y estado.

### 2.1. Herramientas

Comprueba:

```bash
terraform version
docker version
docker compose version
aws --version
jq --version
python3 --version
```

### 2.2. Versiones de referencia

Utilizaremos Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se limita a la serie 5.x como base didáctica.

### 2.3. Conocimientos recomendados

Debes reconocer referencias, variables, outputs, `count`, `for_each` y planes guardados.

---

## 3. Compatibilidad del laboratorio

El docente debe validar la combinación concreta antes de distribuir esta práctica.

### 3.1. Operaciones obligatorias

Comprueba:

- Creación y consulta de colas SQS.
- Lectura y modificación de atributos.
- Configuración de políticas de redirección.
- Configuración de permisos de redirección.
- Lectura de etiquetas.
- Envío y recepción de mensajes.
- Eliminación de colas.
- Ejecución de los planes y pruebas seleccionados.

### 3.2. Registro del entorno

Documenta Terraform, proveedor AWS, Docker, AWS CLI e imagen o digest de LocalStack.

### 3.3. Alcance

Terraform implementa los módulos; LocalStack emula las API de SQS.

---

## 4. Qué es un módulo

Un módulo es un conjunto de archivos de configuración Terraform contenidos en un directorio.

### 4.1. Unidad de configuración

Terraform interpreta conjuntamente los archivos `.tf` de ese directorio.

Los nombres `main.tf`, `variables.tf` y `outputs.tf` son convenciones organizativas.

### 4.2. Interfaz

El módulo recibe variables y publica outputs.

Sus recursos internos implementan la responsabilidad que representa.

### 4.3. Subdirectorios

Terraform no incorpora automáticamente la configuración de todos los subdirectorios.

### 4.4. Regla principal

**Un módulo hijo participa en la configuración cuando una llamada `module` lo incorpora.**

---

## 5. Módulo raíz y módulo hijo

La diferencia depende del papel que ocupa cada directorio durante una ejecución.

### 5.1. Comparación

| **Concepto** | **Responsabilidad** | **Ubicación del laboratorio** |
|-------------|---------------------|-------------------------------|
| Módulo raíz | Componer infraestructura y configurar ejecución | Raíz del proyecto |
| Módulo hijo | Implementar una responsabilidad reutilizable | `modules/queue` |
| Llamada al módulo | Proporcionar entradas y consumir salidas | Bloque `module` |
| Estado | Conservar relaciones de todas las instancias | Backend de la raíz |

El módulo hijo no crea automáticamente un estado independiente.

### 5.2. Composición

Sus recursos aparecen dentro del estado utilizado por la configuración raíz.

### 5.3. Regla

Separar archivos en módulos no equivale a separar permisos, cuentas o backends.

---

## 6. Qué responsabilidad tendrá nuestro módulo

El módulo representará una cola de trabajo con una estrategia opcional de aislamiento de mensajes problemáticos.

### 6.1. Componentes

Puede crear:

- Una cola principal.
- Una DLQ.
- Una política de redirección en la cola principal.
- Una política que autoriza esa redirección en la DLQ.

### 6.2. Fuera de alcance

No creará consumidores, funciones Lambda, alarmas ni permisos de aplicación.

### 6.3. Motivo

Esas responsabilidades pueden componerse desde otros módulos.

### 6.4. Regla

Un módulo útil tiene una frontera comprensible, no necesariamente una colección extensa de recursos.

---

## 7. Reutilización y abstracción

Reutilizar código no significa ocultar todas las decisiones del servicio.

### 7.1. Decisiones visibles

El consumidor podrá elegir nombre, retención, visibilidad y uso de DLQ.

### 7.2. Decisiones encapsuladas

El módulo construirá los ARN relacionados y las políticas correspondientes.

### 7.3. Límite

No expondremos todas las opciones existentes de SQS.

### 7.4. Evolución

Una nueva necesidad puede justificar ampliar la interfaz de forma compatible.

### 7.5. Regla

Evita convertir cada atributo del proveedor en una variable sin explicar su propósito.

---

## 8. Diseño de la interfaz

La interfaz debe expresar decisiones de uso, no obligar al consumidor a conocer los recursos internos.

### 8.1. Entradas principales

| **Entrada** | **Responsabilidad** | **Valor predeterminado** |
|-------------|---------------------|-------------------------|
| `name` | Nombre de la cola principal | Obligatorio |
| `visibility_timeout_seconds` | Visibilidad de mensajes recibidos | 60 |
| `message_retention_seconds` | Retención de mensajes | 86400 |
| `enable_dlq` | Activar infraestructura de DLQ | `true` |
| `max_receive_count` | Umbral de redirección | 5 |

También definiremos retención de DLQ y etiquetas.

### 8.2. Convención

La DLQ utilizará el nombre principal seguido de `-dlq`.

### 8.3. Restricción didáctica

El módulo solo admitirá colas estándar, no FIFO.

---

## 9. Outputs como contrato

Los outputs permiten utilizar el módulo sin depender directamente de sus direcciones internas.

### 9.1. Salidas previstas

Publicaremos:

- Nombre de la cola.
- URL de la cola.
- ARN de la cola.
- Indicador de DLQ activada.
- URL de la DLQ, cuando exista.
- ARN de la DLQ, cuando exista.

### 9.2. Infraestructura opcional

Cuando no exista DLQ, sus salidas utilizarán `null`.

### 9.3. Regla

Documenta esos valores opcionales para que los consumidores no presupongan cadenas siempre disponibles.

---

## 10. Proveedores y módulos reutilizables

La configuración de acceso al proveedor pertenece a la composición del laboratorio.

### 10.1. Módulo hijo

Declarará que necesita el proveedor `hashicorp/aws`.

No contendrá credenciales ni endpoints propios.

### 10.2. Módulo raíz

Configurará región, credenciales ficticias y endpoint LocalStack.

### 10.3. Herencia

El módulo utilizará la configuración AWS predeterminada heredada de la raíz.

### 10.4. Regla

No fijes `localhost` dentro de un módulo que pretendes reutilizar en otros entornos.

---

## 11. Arquitectura del despliegue

Utilizaremos dos instancias del mismo módulo.

### 11.1. Componentes

```text
Configuración raíz
    │
    ├── Módulo orders
    │     ├── Cola principal
    │     ├── DLQ
    │     └── Políticas de redirección
    │
    └── Módulo audit
          └── Cola principal
```

### 11.2. Resultado inicial

Existirán tres colas y dos recursos Terraform de política.

### 11.3. Estado

Las cinco relaciones administradas quedarán en un único estado local.

---

## 12. Preparación del directorio

Trabaja en una carpeta independiente.

### 12.1. Estructura

```bash
mkdir -p terraform-custom-modules/modules/queue
mkdir -p terraform-custom-modules/tests
mkdir -p terraform-custom-modules/planes
mkdir -p terraform-custom-modules/resultados
mkdir -p terraform-custom-modules/copias
mkdir -p terraform-custom-modules/examples
cd terraform-custom-modules
```

### 12.2. Ejecución

Los comandos se ejecutan desde esta raíz, salvo indicación expresa.

### 12.3. Aislamiento

No reutilices el estado de otra práctica.

---

## 13. Protección de archivos

Separa material versionable y artefactos operativos.

### 13.1. `.gitignore`

```gitignore
**/.terraform/
**/*.tfstate
**/*.tfstate.*
**/*.tfplan
.env
planes/
resultados/
copias/
crash.log
```

### 13.2. Qué conservar

Versiona configuración, pruebas, documentación y `.terraform.lock.hcl`.

### 13.3. Precaución

Los estados y planes pueden contener información sensible en proyectos reales.

---

## 14. Imagen y Docker Compose

Utiliza una imagen validada por el docente.

### 14.1. Selección

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 14.2. `compose.yaml`

```yaml
services:
  localstack:
    image: ${LOCALSTACK_IMAGE:?Define LOCALSTACK_IMAGE}
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: sqs
      AWS_DEFAULT_REGION: us-east-1
      SQS_ENDPOINT_STRATEGY: path
```

### 14.3. Alcance

No necesitamos montar el socket Docker dentro de LocalStack.

---

## 15. Credenciales y conectividad

Prepara la terminal antes de utilizar AWS CLI o Terraform.

### 15.1. Configuración

```bash
docker compose up -d

export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_PAGER=""

unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
unset AWS_ENDPOINT_URL AWS_ENDPOINT_URL_SQS TF_WORKSPACE

aws_local() {
  aws --endpoint-url=http://localhost:4566 --region us-east-1 "$@"
}
```

### 15.2. Comprobación

Ejecuta `aws_local sqs list-queues` y espera una respuesta válida.

---

## 16. Requisitos del módulo hijo

Crea `modules/queue/versions.tf`.

### 16.1. Configuración

```hcl
terraform {
  required_version = ">= 1.6.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0, < 6.0"
    }
  }
}
```

### 16.2. Contrato

El módulo declara el proveedor que necesita y su intervalo admitido.

### 16.3. Selección concreta

La configuración raíz y el archivo de bloqueo determinarán la versión utilizada en esta ejecución.

---

## 17. Variable de identidad

Crea `modules/queue/variables.tf` y comienza por el nombre.

### 17.1. Declaración

```hcl
variable "name" {
  description = "Nombre de una cola estándar; la DLQ añade el sufijo -dlq."
  type        = string
  nullable    = false

  validation {
    condition     = can(regex("^[A-Za-z0-9_-]{3,60}$", var.name))
    error_message = "Usa entre 3 y 60 caracteres alfanuméricos, guiones o guiones bajos."
  }
}
```

### 17.2. Margen para la DLQ

El límite del módulo deja espacio para añadir el sufijo.

### 17.3. Colas FIFO

La expresión no permite el sufijo `.fifo`, coherentemente con el alcance declarado.

---

## 18. Variables de la cola principal

Completa el mismo archivo con visibilidad y retención.

### 18.1. Declaraciones

```hcl
variable "visibility_timeout_seconds" {
  description = "Tiempo durante el que un mensaje recibido permanece invisible."
  type        = number
  default     = 60
  nullable    = false

  validation {
    condition = (
      var.visibility_timeout_seconds >= 0 &&
      var.visibility_timeout_seconds <= 43200 &&
      floor(var.visibility_timeout_seconds) == var.visibility_timeout_seconds
    )
    error_message = "Usa un entero entre 0 y 43200."
  }
}

variable "message_retention_seconds" {
  description = "Retención de mensajes de la cola principal."
  type        = number
  default     = 86400
  nullable    = false

  validation {
    condition = (
      var.message_retention_seconds >= 60 &&
      var.message_retention_seconds <= 1209600 &&
      floor(var.message_retention_seconds) == var.message_retention_seconds
    )
    error_message = "Usa un entero entre 60 y 1209600."
  }
}
```

---

## 19. Variables de activación y reintentos

Añade las decisiones principales de redirección.

### 19.1. Declaraciones

```hcl
variable "enable_dlq" {
  description = "Crea una DLQ y configura la redirección de la cola principal."
  type        = bool
  default     = true
  nullable    = false
}

variable "max_receive_count" {
  description = "Umbral de recepciones utilizado por la política de redirección."
  type        = number
  default     = 5
  nullable    = false

  validation {
    condition = (
      var.max_receive_count >= 1 &&
      var.max_receive_count <= 1000 &&
      floor(var.max_receive_count) == var.max_receive_count
    )
    error_message = "Usa un entero entre 1 y 1000."
  }
}
```

### 19.2. Interpretación

El umbral cuenta recepciones, no excepciones registradas por una aplicación.

---

## 20. Retención de DLQ y etiquetas

Completa `modules/queue/variables.tf`.

### 20.1. Declaraciones

```hcl
variable "dlq_retention_seconds" {
  description = "Retención de mensajes de la DLQ."
  type        = number
  default     = 1209600
  nullable    = false

  validation {
    condition = (
      var.dlq_retention_seconds >= 60 &&
      var.dlq_retention_seconds <= 1209600 &&
      floor(var.dlq_retention_seconds) == var.dlq_retention_seconds
    )
    error_message = "Usa un entero entre 60 y 1209600."
  }
}

variable "tags" {
  description = "Etiquetas comunes; QueueRole queda reservado al módulo."
  type        = map(string)
  default     = {}
  nullable    = false
}
```

### 20.2. Convención

El módulo añadirá una etiqueta interna para distinguir cola principal y DLQ.

---

## 21. Crear los recursos principales

Crea `modules/queue/main.tf`.

### 21.1. Cola principal y DLQ opcional

```hcl
resource "aws_sqs_queue" "main" {
  name                       = var.name
  visibility_timeout_seconds = var.visibility_timeout_seconds
  message_retention_seconds  = var.message_retention_seconds

  tags = merge(var.tags, {
    QueueRole = "main"
  })

  lifecycle {
    precondition {
      condition = (
        !var.enable_dlq ||
        var.dlq_retention_seconds >= var.message_retention_seconds
      )
      error_message = "La retención de la DLQ debe ser al menos la de la cola principal."
    }
  }
}

resource "aws_sqs_queue" "dlq" {
  count = var.enable_dlq ? 1 : 0

  name                      = "${var.name}-dlq"
  message_retention_seconds = var.dlq_retention_seconds

  tags = merge(var.tags, {
    QueueRole = "dlq"
  })
}
```

---

## 22. Configurar las políticas relacionadas

Añade a `modules/queue/main.tf` las relaciones de redirección.

### 22.1. Recursos de política

```hcl
resource "aws_sqs_queue_redrive_allow_policy" "dlq" {
  count = var.enable_dlq ? 1 : 0

  queue_url = aws_sqs_queue.dlq[0].id

  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue"
    sourceQueueArns   = [aws_sqs_queue.main.arn]
  })
}

resource "aws_sqs_queue_redrive_policy" "main" {
  count = var.enable_dlq ? 1 : 0

  queue_url = aws_sqs_queue.main.id

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq[0].arn
    maxReceiveCount     = var.max_receive_count
  })

  depends_on = [aws_sqs_queue_redrive_allow_policy.dlq]
}
```

---

## 23. Comprender las referencias opcionales

Las referencias indexadas son coherentes con el mismo control de activación.

### 23.1. Cuando hay DLQ

Los tres recursos opcionales tienen una instancia `[0]`.

La política principal puede referenciar la DLQ existente.

### 23.2. Cuando no hay DLQ

Los tres recursos opcionales tienen cero instancias.

No se crea una política que apunte a una cola ausente.

### 23.3. Regla

Controla conjuntamente los recursos que dependen de una opción.

### 23.4. Precaución

Desactivar la opción posteriormente puede destruir infraestructura y mensajes existentes.

---

## 24. Outputs del módulo

Crea `modules/queue/outputs.tf`.

### 24.1. Interfaz de salida

```hcl
output "name" {
  description = "Nombre de la cola principal."
  value       = aws_sqs_queue.main.name
}

output "queue_url" {
  description = "URL de la cola principal."
  value       = aws_sqs_queue.main.id
}

output "queue_arn" {
  description = "ARN de la cola principal."
  value       = aws_sqs_queue.main.arn
}

output "dlq_enabled" {
  description = "Indica si esta instancia utiliza DLQ."
  value       = var.enable_dlq
}

output "dlq_url" {
  description = "URL de la DLQ, o null si está desactivada."
  value       = try(aws_sqs_queue.dlq[0].id, null)
}

output "dlq_arn" {
  description = "ARN de la DLQ, o null si está desactivada."
  value       = try(aws_sqs_queue.dlq[0].arn, null)
}
```

---

## 25. Requisitos de la configuración raíz

Crea `versions.tf` en la raíz del proyecto.

### 25.1. Configuración

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

### 25.2. Backend

Utilizaremos el backend local predeterminado.

### 25.3. Restricciones combinadas

Terraform debe seleccionar una versión que satisfaga la raíz y el módulo hijo.

---

## 26. Proveedor LocalStack en la raíz

Crea `providers.tf`.

### 26.1. Configuración

```hcl
provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    sqs = "http://localhost:4566"
  }
}
```

### 26.2. Herencia

Las instancias del módulo utilizarán esta configuración predeterminada.

### 26.3. Regla

El módulo no necesita conocer que el proveedor apunta a LocalStack.

---

## 27. Variables de composición

Crea `variables.tf` en la raíz.

### 27.1. Sufijo y componentes

```hcl
variable "suffix" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.suffix))
    error_message = "Usa entre 4 y 8 caracteres alfanuméricos."
  }
}

variable "components" {
  type = map(object({
    enable_dlq                 = bool
    visibility_timeout_seconds = number
    message_retention_seconds  = number
  }))
  nullable = false

  validation {
    condition = (
      length(var.components) > 0 &&
      alltrue([
        for key in keys(var.components) :
        can(regex("^[a-z][a-z0-9-]{1,15}$", key))
      ])
    )
    error_message = "Declara componentes con claves cortas, minúsculas y estables."
  }
}
```

---

## 28. Entradas del laboratorio

Crea `terraform.tfvars`.

### 28.1. Configuración inicial

```hcl
suffix = "alumno01"

components = {
  orders = {
    enable_dlq                 = true
    visibility_timeout_seconds = 60
    message_retention_seconds  = 86400
  }

  audit = {
    enable_dlq                 = false
    visibility_timeout_seconds = 30
    message_retention_seconds  = 172800
  }
}
```

### 28.2. Identidad

Las claves `orders` y `audit` formarán parte de las direcciones del módulo.

### 28.3. Regla

Trátalas como identificadores estables, no como etiquetas intercambiables.

---

## 29. Componer las instancias del módulo

Crea `main.tf` en la raíz.

### 29.1. Llamada reutilizable

```hcl
module "queue" {
  source   = "./modules/queue"
  for_each = var.components

  name = "curso-module-${var.suffix}-${each.key}"

  enable_dlq                 = each.value.enable_dlq
  visibility_timeout_seconds = each.value.visibility_timeout_seconds
  message_retention_seconds  = each.value.message_retention_seconds

  max_receive_count     = 5
  dlq_retention_seconds = 1209600

  tags = {
    Laboratory = "LocalStack"
    Component  = each.key
    ManagedBy  = "Terraform"
  }
}
```

### 29.2. Defaults

El consumidor puede omitir entradas con valores predeterminados cuando esos valores sean adecuados.

---

## 30. Publicar resultados desde la raíz

Crea `outputs.tf`.

### 30.1. Mapa de componentes

```hcl
output "services" {
  description = "Identificadores publicados por cada instancia del módulo."

  value = {
    for key, queue in module.queue : key => {
      name        = queue.name
      queue_url   = queue.queue_url
      queue_arn   = queue.queue_arn
      dlq_enabled = queue.dlq_enabled
      dlq_url     = queue.dlq_url
      dlq_arn     = queue.dlq_arn
    }
  }
}
```

### 30.2. Encapsulación

La raíz utiliza outputs, no intenta acceder directamente a los recursos internos del módulo.

### 30.3. Ventaja

Puedes reorganizar internamente el módulo conservando su interfaz pública.

---

## 31. Sesión 1: validar y preparar el despliegue

Duración orientativa: 25 minutos.

### 31.1. Secuencia

```bash
terraform init
terraform fmt -recursive
terraform validate
terraform workspace show
terraform providers

terraform plan -out=planes/create.tfplan
terraform show planes/create.tfplan
```

### 31.2. Resultado esperado

El workspace debe ser `default`.

El plan debe crear cinco recursos administrados.

### 31.3. Revisión

Confirma tres colas y dos políticas, no cinco colas.

---

## 32. Sesión 2: aplicar y consultar el estado

La aplicación crea las instancias descritas por la composición raíz.

### 32.1. Comandos

```bash
terraform apply planes/create.tfplan
terraform state list
terraform output -json services \
  > resultados/services-initial.json
```

### 32.2. Direcciones esperadas

```text
module.queue["audit"].aws_sqs_queue.main
module.queue["orders"].aws_sqs_queue.main
module.queue["orders"].aws_sqs_queue.dlq[0]
module.queue["orders"].aws_sqs_queue_redrive_policy.main[0]
module.queue["orders"].aws_sqs_queue_redrive_allow_policy.dlq[0]
```

### 32.3. Estado compartido

Todas esas direcciones pertenecen al mismo backend local.

---

## 33. Sesión 3: verificar el contrato de salida

Comprueba que las salidas representan correctamente la infraestructura opcional.

### 33.1. Lectura

```bash
jq '.' resultados/services-initial.json

ORDERS_URL="$(jq -er '.orders.queue_url' resultados/services-initial.json)"
ORDERS_DLQ="$(jq -er '.orders.dlq_url' resultados/services-initial.json)"
AUDIT_URL="$(jq -er '.audit.queue_url' resultados/services-initial.json)"
```

### 33.2. Comprobación

`orders` debe tener DLQ activada y sus identificadores disponibles.

`audit` debe indicar DLQ desactivada y utilizar `null` en sus salidas de DLQ.

### 33.3. Regla

Un output registrado no sustituye una consulta de existencia al servicio.

---

## 34. Sesión 4: comprobar las políticas en SQS

Utiliza una fuente independiente del estado Terraform.

### 34.1. Consultas

```bash
aws_local sqs get-queue-attributes \
  --queue-url "$ORDERS_URL" \
  --attribute-names RedrivePolicy VisibilityTimeout \
  > resultados/orders-attributes.json

aws_local sqs get-queue-attributes \
  --queue-url "$ORDERS_DLQ" \
  --attribute-names RedriveAllowPolicy MessageRetentionPeriod \
  > resultados/dlq-attributes.json
```

### 34.2. Lectura

Las políticas aparecen como JSON dentro de cadenas.

Puedes interpretarlas con `jq '.Attributes.RedrivePolicy | fromjson'`.

### 34.3. Resultado

El ARN de destino debe corresponder a la DLQ de `orders`.

---

## 35. Sesión 5: verificar el componente sin DLQ

La opción desactivada debe eliminar la relación, no solo ocultar un output.

### 35.1. Consulta

```bash
aws_local sqs get-queue-attributes \
  --queue-url "$AUDIT_URL" \
  --attribute-names All \
  > resultados/audit-attributes.json

jq '.Attributes.RedrivePolicy // "Sin política de redirección"' \
  resultados/audit-attributes.json
```

### 35.2. Resultado esperado

La cola de auditoría no tiene una política de redirección configurada por este módulo.

### 35.3. Evidencia adicional

El estado no debe contener recursos opcionales dentro de `module.queue["audit"]`.

---

## 36. Sesión 6: enviar y confirmar un mensaje

Una prueba funcional básica complementa las verificaciones de configuración.

### 36.1. Envío y recepción

```bash
aws_local sqs send-message \
  --queue-url "$ORDERS_URL" \
  --message-body '{"order_id":"ORDER-001","exercise":"custom-module"}' \
  > resultados/message-sent.json

aws_local sqs receive-message \
  --queue-url "$ORDERS_URL" \
  --max-number-of-messages 1 \
  --wait-time-seconds 5 \
  > resultados/message-received.json
```

### 36.2. Confirmación

Obtén `ReceiptHandle` del mensaje recibido y elimínalo con `delete-message`.

### 36.3. Distinción

Terraform administra la infraestructura; no confirma mensajes de aplicación.

---

## 37. Probar redirección como ampliación

La configuración de una DLQ no demuestra por sí sola que un mensaje haya sido redirigido.

### 37.1. Procedimiento controlado

Envía un mensaje nuevo a `orders`.

Recíbelo sin eliminarlo.

Espera el vencimiento de visibilidad y vuelve a recibirlo.

Repite dentro de una ventana temporal acotada.

### 37.2. Observación

El mensaje puede terminar en la DLQ después de superar el umbral de recepciones.

### 37.3. Precaución

La transferencia no debe asumirse instantánea ni basada en excepciones de Python.

### 37.4. Alcance

El docente debe validar este comportamiento de redirección en la imagen seleccionada.

---

## 38. Sesión 7: comprobar una validación negativa

Una entrada inválida debe rechazarse antes de administrar atributos incorrectos.

### 38.1. Archivo de prueba

Crea `examples/invalid.tfvars`:

```hcl
components = {
  orders = {
    enable_dlq                 = true
    visibility_timeout_seconds = -1
    message_retention_seconds  = 86400
  }
}
```

### 38.2. Ejecución

```bash
terraform plan -var-file=examples/invalid.tfvars
```

### 38.3. Resultado esperado

La validación del módulo debe rechazar la visibilidad negativa.

No apliques ninguna propuesta parcial que pudiera aparecer junto al error.

---

## 39. Sesión 8: modificar un componente

Comprueba que una entrada específica afecta solamente a su instancia.

### 39.1. Cambio

En `terraform.tfvars`, cambia la visibilidad de `orders` de 60 a 90.

Conserva las entradas de `audit`.

### 39.2. Revisión y aplicación

```bash
terraform plan -out=planes/update-orders.tfplan
terraform show planes/update-orders.tfplan
terraform apply planes/update-orders.tfplan
```

### 39.3. Resultado esperado

La cola principal de `orders` se actualiza sin reemplazo.

### 39.4. Verificación

`audit` conserva 30 segundos y ambas URLs permanecen iguales.

---

## 40. Sesión 9: activar la DLQ de auditoría

Una opción del módulo puede modificar el número de recursos administrados.

### 40.1. Cambio

Establece `enable_dlq = true` para `audit`.

### 40.2. Secuencia

```bash
terraform plan -out=planes/enable-audit-dlq.tfplan
terraform show planes/enable-audit-dlq.tfplan
terraform apply planes/enable-audit-dlq.tfplan
```

### 40.3. Resultado esperado

Se crean una DLQ y dos recursos de política adicionales.

La cola principal de auditoría no debe recrearse.

### 40.4. Inventario

El total pasa a ocho recursos Terraform y cuatro colas SQS.

---

## 41. Desactivar infraestructura opcional

Revertir una opción puede tener consecuencias destructivas.

### 41.1. Prueba con revisión

Si vuelves a desactivar la DLQ de auditoría, el plan retirará sus políticas y destruirá esa cola.

### 41.2. Datos

Los mensajes que contenga la DLQ se perderán al eliminarla.

### 41.3. Procedimiento

Comprueba contenido, exportación y autorización antes de aplicar.

### 41.4. Regla

Una variable booleana puede representar una decisión de ciclo de vida, no un cambio cosmético.

### 41.5. Laboratorio

Deja registrada la configuración final elegida para que la limpieza corresponda a su estado real.

---

## 42. Pruebas declarativas de planificación

Terraform puede comprobar expectativas mediante archivos `.tftest.hcl`.

### 42.1. `tests/interface.tftest.hcl`

```hcl
run "module_interface_plan" {
  command = plan

  variables {
    suffix = "test01"

    components = {
      orders = {
        enable_dlq                 = true
        visibility_timeout_seconds = 60
        message_retention_seconds  = 86400
      }
      audit = {
        enable_dlq                 = false
        visibility_timeout_seconds = 30
        message_retention_seconds  = 172800
      }
    }
  }

  assert {
    condition     = output.services["orders"].name == "curso-module-test01-orders"
    error_message = "El nombre publicado no coincide con la convención."
  }

  assert {
    condition     = output.services["orders"].dlq_enabled
    error_message = "Orders debe declarar DLQ activada."
  }

  assert {
    condition     = output.services["audit"].dlq_url == null
    error_message = "Audit no debe publicar una DLQ inexistente."
  }
}
```

---

## 43. Sesión 10: ejecutar las pruebas

Las pruebas de planificación no sustituyen la verificación funcional del servicio.

### 43.1. Comando

```bash
terraform fmt -recursive
terraform validate
terraform test
```

### 43.2. Alcance

Este archivo solicita un plan, no una aplicación de los recursos de prueba.

Terraform utiliza un contexto de prueba separado del estado normal.

### 43.3. Proveedor

No utilizamos mocks; conserva LocalStack disponible y endpoints locales.

### 43.4. Regla

Una aserción de interfaz no demuestra redirección efectiva, rendimiento ni aplicación completa de IAM.

---

## 44. Documentación del módulo

Crea `modules/queue/README.md` con la información que necesita un consumidor.

### 44.1. Contenido mínimo

Documenta propósito, versiones, entradas y outputs.

Explica infraestructura opcional y consecuencias de desactivarla.

Incluye una llamada mínima y las limitaciones conocidas.

### 44.2. Ejemplo de uso

```hcl
module "jobs" {
  source = "./modules/queue"

  name       = "curso-example-jobs"
  enable_dlq = true

  tags = {
    Laboratory = "LocalStack"
  }
}
```

### 44.3. Contexto

El consumidor debe proporcionar una configuración AWS adecuada y local para esta práctica.

---

## 45. Direcciones y refactorización

Los nombres internos del módulo forman parte de las direcciones registradas.

### 45.1. Ejemplo

```text
module.queue["orders"].aws_sqs_queue.main
```

### 45.2. Cambios sensibles

Renombrar `main`, cambiar la llamada `queue` o modificar la clave `orders` altera direcciones.

### 45.3. Migración

Una refactorización que conserve objetos puede necesitar bloques `moved`.

### 45.4. Contrato público

Conservar outputs ayuda a consumidores, pero no migra automáticamente el estado.

### 45.5. Regla

No confundas estabilidad de interfaz con estabilidad de las direcciones internas.

---

## 46. Evolución y distribución del módulo

Un módulo local puede convertirse posteriormente en una unidad distribuida.

### 46.1. Fuentes posibles

Terraform admite módulos locales, repositorios y registros compatibles.

### 46.2. Versiones

La selección mediante `version` corresponde a fuentes de registro, no a una ruta local.

Las fuentes Git pueden fijarse mediante una referencia concreta.

### 46.3. Bloqueo

`.terraform.lock.hcl` fija proveedores; no bloquea automáticamente todas las versiones de módulos remotos.

### 46.4. Regla

Documenta la fuente y fija revisiones reproducibles antes de compartir una dependencia remota.

---

## 47. Límites de diseño del ejemplo

Este módulo representa una solución deliberadamente acotada.

### 47.1. No incluye

Colas FIFO, políticas de aplicación, claves KMS, alarmas ni procesos de recuperación.

### 47.2. Retención

La retención de DLQ debe diseñarse según la investigación y recuperación previstas.

### 47.3. Visibilidad

Debe ajustarse al consumidor y al tiempo de procesamiento, no solo a un valor predeterminado.

### 47.4. Seguridad

Etiquetar una cola no autoriza a un consumidor a utilizarla.

### 47.5. Regla

Un módulo reusable no elimina la necesidad de entender el servicio que encapsula.

---

## 48. Diagnóstico de problemas frecuentes

Investiga primero la capa donde ocurre el error.

### 48.1. Lista de revisión

Comprueba:

- Ruta `source` incorrecta.
- Módulo nuevo sin inicialización.
- Variable obligatoria ausente.
- Tipo de entrada incompatible.
- Nombre remoto duplicado.
- Referencia a un output inexistente.
- Índice opcional mal controlado.
- Endpoint o región incorrectos.
- Estado o workspace equivocado.

### 48.2. Regla

No ejecutes importaciones ni retires relaciones del estado para corregir un simple error de interfaz.

---

## 49. Limpieza del laboratorio

Mantén LocalStack disponible durante la destrucción.

### 49.1. Secuencia revisada

```bash
umask 077
terraform state pull > copias/before-destroy.tfstate

terraform plan -destroy -out=planes/destroy.tfplan
terraform show planes/destroy.tfplan
terraform apply planes/destroy.tfplan

terraform state list
aws_local sqs list-queues
docker compose down
```

### 49.2. Datos

La destrucción elimina las colas y sus mensajes pendientes.

### 49.3. Condición

El número de recursos dependerá de si dejaste activada la DLQ de auditoría.

---

## 50. Diferencias respecto a AWS real

La emulación permite practicar composición e integración, no certificar producción.

### 50.1. Aspectos adicionales

En AWS real revisa permisos IAM, políticas, cifrado, cuotas, costes y auditoría.

Valida propagación, redirección, métricas y recuperación de mensajes.

### 50.2. Persistencia local

Eliminar LocalStack puede hacer desaparecer las colas mientras Terraform conserva sus relaciones.

### 50.3. Seguridad

Las credenciales ficticias y omisiones del proveedor pertenecen exclusivamente al laboratorio.

### 50.4. Regla

El módulo puede reutilizarse conceptualmente; la configuración de ejecución necesita revisión para cada entorno.

---

## 51. Ejercicios y evaluación

La evaluación debe demostrar una interfaz comprensible y recursos verificables.

### 51.1. Ejercicios

1. Documenta todas las variables y sus límites.
2. Despliega dos instancias con opciones diferentes.
3. Comprueba políticas y salidas opcionales.
4. Rechaza una entrada inválida.
5. Modifica un componente sin alterar el otro.
6. Activa una DLQ y explica su ciclo de vida.
7. Añade una prueba de interfaz.
8. Destruye y verifica todos los recursos.

### 51.2. Entrega

Incluye módulo, composición raíz, documentación, planes revisados y evidencias de servicio.

---

## 52. Resumen de la lección

Un módulo personalizado permite encapsular una responsabilidad y ofrecer un contrato reutilizable.

### 52.1. Ideas esenciales

- La raíz compone; el módulo implementa.
- Variables y outputs forman la interfaz.
- Validaciones reducen errores de entrada.
- El proveedor se configura en el contexto consumidor.
- Infraestructura opcional implica decisiones de ciclo de vida.
- `for_each` permite reutilizar instancias con identidad estable.
- Las pruebas de plan complementan las verificaciones funcionales.
- La documentación debe explicar límites y consecuencias.

### 52.2. Procedimiento recomendado

Diseña la interfaz, implementa relaciones, revisa el plan y comprueba el servicio.

### 52.3. Idea final

**Un buen módulo no solo evita repetir código: hace explícitas las decisiones, conserva una interfaz comprensible y permite verificar qué infraestructura crea y cómo debe administrarse.**