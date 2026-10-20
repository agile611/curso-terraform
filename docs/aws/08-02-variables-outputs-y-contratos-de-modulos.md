# Variables, outputs y contratos de módulos con Terraform y LocalStack

Un módulo Terraform no se define únicamente por los recursos que crea.

También se define por las entradas que acepta, las salidas que publica y las garantías que ofrece a quienes lo utilizan.

Ese conjunto constituye su contrato.

Un contrato claro permite reutilizar infraestructura sin obligar a cada consumidor a conocer todos los detalles internos.

En esta lección diseñarás un módulo SQS con entradas estructuradas, valores opcionales, validaciones y outputs documentados.

Después lo consumirás desde una configuración raíz y comprobarás su comportamiento con Terraform y LocalStack.

Las sesiones incluyen casos válidos, entradas incompatibles, cambios compatibles, pruebas de planificación y verificación independiente del servicio.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> El módulo es didáctico y no constituye una solución completa de mensajería para producción.

---

## 1. Objetivos de aprendizaje

Esta lección convierte la interfaz de un módulo en un elemento explícito de diseño.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Definir entradas con tipos estructurados.
- Diferenciar ausencia, `null` y valores concretos.
- Utilizar atributos opcionales con valores predeterminados.
- Validar reglas locales y relaciones entre atributos.
- Diseñar outputs estables.
- Consumir resultados sin depender de recursos internos.
- Reconocer cambios incompatibles.
- Probar expectativas del contrato.

### 1.2. Resultado práctico

Construirás un módulo de cola estándar con DLQ opcional y una salida estructurada para sus consumidores.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos de módulos, SQS y estado.

### 2.1. Herramientas

Comprueba:

```bash
terraform version
docker version
docker compose version
aws --version
jq --version
```

### 2.2. Versiones utilizadas

Utilizaremos Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se limita a la serie 5.x.

Los comandos utilizan Bash y se ejecutan desde el host.

### 2.3. Conocimientos recomendados

Debes reconocer variables, outputs, referencias, `count`, `for_each` y planes guardados.

---

## 3. Compatibilidad del laboratorio

El docente debe validar la combinación concreta antes de distribuir la práctica.

### 3.1. Operaciones obligatorias

Comprueba:

- Creación y consulta de colas SQS.
- Configuración de políticas de redirección.
- Lectura de etiquetas.
- Modificación de atributos.
- Envío, recepción y eliminación de mensajes.
- Ejecución de pruebas de planificación.
- Destrucción de infraestructura opcional.

### 3.2. Registro del entorno

Documenta Terraform, proveedor AWS, Docker, AWS CLI e imagen o digest de LocalStack.

### 3.3. Alcance

Terraform interpreta el contrato; LocalStack emula las API utilizadas por los recursos.

---

## 4. Qué es el contrato de un módulo

El contrato describe cómo utilizar el módulo y qué resultados esperar.

### 4.1. Componentes

Incluye:

- Entradas aceptadas.
- Tipos y restricciones.
- Valores predeterminados.
- Significado de las opciones.
- Outputs publicados.
- Valores opcionales.
- Consecuencias operacionales.
- Compatibilidad declarada.

### 4.2. Regla principal

**El consumidor debería poder utilizar el módulo sin inspeccionar todos sus recursos internos.**

---

## 5. Contrato e implementación

La interfaz pública y los detalles internos tienen responsabilidades diferentes.

### 5.1. Comparación

| **Elemento** | **Ejemplo** | **Responsabilidad** |
|--------------|-------------|--------------------|
| Entrada pública | `queue.name` | Expresar una decisión |
| Output público | `contract.queue.url` | Publicar un identificador |
| Recurso interno | `aws_sqs_queue.main` | Implementar infraestructura |
| Migración interna | Bloque `moved` | Conservar relaciones de estado |

Los outputs no permiten acceder automáticamente a cualquier atributo interno.

### 5.2. Encapsulación

La raíz utiliza `module.jobs.contract`.

No puede referenciar directamente `module.jobs.aws_sqs_queue.main`.

### 5.3. Límite

Una interfaz estable no evita por sí sola reemplazos de infraestructura.

---

## 6. Contrato documentado y contrato comprobado

La documentación explica el significado; Terraform comprueba parte de las reglas.

### 6.1. Mecanismos

Utilizaremos:

- `description`.
- Restricciones de tipo.
- `default`.
- `nullable`.
- `validation`.
- Preconditions y postconditions.
- Pruebas declarativas.

### 6.2. Alcance

No todas las garantías operacionales pueden expresarse mediante HCL.

### 6.3. Ejemplo

Un tipo válido no demuestra que un consumidor procese mensajes antes de vencer la visibilidad.

---

## 7. Variables obligatorias y predeterminadas

Una variable sin `default` requiere un valor del consumidor.

### 7.1. Entrada obligatoria

```hcl
variable "name" {
  type        = string
  description = "Nombre de la cola."
}
```

### 7.2. Entrada predeterminada

```hcl
variable "visibility_timeout_seconds" {
  type    = number
  default = 60
}
```

### 7.3. Decisión de diseño

Un valor predeterminado debe ser razonable y estar documentado.

No debe ocultar una decisión crítica que el consumidor necesita revisar.

---

## 8. Tipos primitivos y conversiones

Terraform distingue cadenas, números y booleanos, pero admite determinadas conversiones automáticas.

### 8.1. Tipos básicos

```hcl
type = string
type = number
type = bool
```

### 8.2. Precaución

Una entrada textual compatible puede convertirse al tipo esperado.

El tipo declarado no equivale a comprobar el formato original de un documento JSON.

### 8.3. Validación semántica

Un número puede ser válido como tipo y aun así ser negativo o fraccionario.

### 8.4. Regla

Combina tipos con restricciones que expresen las reglas del servicio.

---

## 9. Colecciones y objetos

Los tipos estructurados permiten expresar interfaces más precisas.

### 9.1. Comparación

| **Tipo** | **Uso habitual** | **Propiedad relevante** |
|----------|-------------------|-------------------------|
| `list(string)` | Secuencia ordenada | Admite repetidos |
| `set(string)` | Valores únicos | No representa un orden estable |
| `map(string)` | Etiquetas | Claves variables |
| `object({...})` | Configuración estructurada | Atributos definidos |
| `tuple([...])` | Secuencia heterogénea | Posiciones con tipos concretos |

Selecciona el tipo según el significado de los datos.

### 9.2. Laboratorio

Utilizaremos un objeto para la configuración y un mapa para etiquetas.

### 9.3. Regla

No utilices `any` únicamente para evitar diseñar la interfaz.

---

## 10. Objetos y atributos adicionales

Un objeto tipado delimita los atributos que conserva Terraform durante la conversión.

### 10.1. Precaución importante

Al convertir un valor más amplio a un tipo `object`, pueden descartarse atributos adicionales.

### 10.2. Consecuencia

Un error de escritura en un atributo opcional puede pasar inadvertido y activar su valor predeterminado.

### 10.3. Ejemplo conceptual

`visiblity_timeout_seconds` no es el atributo documentado `visibility_timeout_seconds`.

### 10.4. Protección

Revisa archivos de entradas y utiliza pruebas sobre los valores efectivos.

### 10.5. Regla

Un objeto tipado no garantiza rechazo universal de claves desconocidas.

---

## 11. Ausencia, `null` y valores concretos

Estos casos pueden tener significados diferentes en una interfaz.

### 11.1. Comparación

| **Situación** | **Ejemplo** | **Interpretación posible** |
|---------------|-------------|----------------------------|
| Atributo ausente | No declarar `dlq` | Utilizar comportamiento predeterminado |
| `null` | `dlq = null` | Ausencia explícita |
| Objeto concreto | `dlq = {...}` | Activar una configuración |
| Booleano falso | `enabled = false` | Opción explícitamente desactivada |

La interpretación depende del tipo y los defaults definidos.

### 11.2. Laboratorio

`dlq = null` significa que no se crea infraestructura de DLQ.

### 11.3. Regla

Documenta la semántica, no solo el tipo.

---

## 12. Atributos opcionales con defaults

Terraform permite declarar atributos opcionales dentro de un objeto.

### 12.1. Ejemplo

```hcl
type = object({
  name                       = string
  visibility_timeout_seconds = optional(number, 60)
})
```

### 12.2. Comportamiento

Si el atributo se omite, se utiliza 60.

Con un default no nulo, un `null` explícito también se sustituye por ese default.

### 12.3. Distinción

`optional(object({...}))` sin default conserva `null` cuando no se proporciona el objeto.

### 12.4. Regla

Elige defaults coherentes con la interpretación de ausencia.

---

## 13. Diseño del módulo del laboratorio

El módulo representará una cola estándar y una DLQ opcional.

### 13.1. Entrada principal

Recibirá un objeto `queue` con:

- Nombre.
- Visibilidad.
- Retención.
- Etiquetas.
- Configuración opcional de DLQ.

### 13.2. Salida principal

Publicará un objeto `contract`.

### 13.3. Fuera de alcance

No creará consumidores, permisos de aplicación, alarmas ni colas FIFO.

---

## 14. Arquitectura de la práctica

La configuración raíz consumirá dos instancias del mismo módulo.

### 14.1. Recorrido

```text
Configuración raíz
    ├── jobs
    │    ├── Cola principal
    │    ├── DLQ
    │    └── Políticas
    └── audit
         └── Cola principal
```

### 14.2. Inventario inicial

Habrá tres colas SQS y dos recursos Terraform de política.

### 14.3. Estado

Todas las relaciones se conservarán en el backend local de la raíz.

---

## 15. Preparación del directorio

Trabaja en una carpeta independiente.

### 15.1. Estructura

```bash
mkdir -p terraform-module-contracts/modules/queue
mkdir -p terraform-module-contracts/tests
mkdir -p terraform-module-contracts/examples
mkdir -p terraform-module-contracts/planes
mkdir -p terraform-module-contracts/resultados
mkdir -p terraform-module-contracts/copias
cd terraform-module-contracts
```

### 15.2. Ejecución

Los comandos se ejecutan desde esta raíz.

### 15.3. Aislamiento

No copies el estado de otra lección.

---

## 16. Protección de archivos

Separa configuración versionable y artefactos operativos.

### 16.1. `.gitignore`

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

### 16.2. Qué conservar

Versiona código, pruebas, documentación y `.terraform.lock.hcl`.

### 16.3. Precaución

Los estados y planes pueden contener información sensible aunque la presentación habitual la oculte.

---

## 17. Imagen y Docker Compose

Utiliza una imagen validada por el docente.

### 17.1. Selección

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 17.2. `compose.yaml`

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

### 17.3. Alcance

No necesitamos montar el socket Docker dentro de LocalStack.

---

## 18. Credenciales y conectividad

Prepara la terminal antes de utilizar Terraform o AWS CLI.

### 18.1. Configuración

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

### 18.2. Comprobación

Ejecuta `aws_local sqs list-queues` y espera una respuesta válida.

---

## 19. Requisitos del módulo hijo

Crea `modules/queue/versions.tf`.

### 19.1. Configuración

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

### 19.2. Proveedor

El módulo declara su dependencia, pero no configura credenciales ni endpoints.

### 19.3. Compatibilidad

Las restricciones de la raíz y del módulo deben poder satisfacerse conjuntamente.

---

## 20. Entrada estructurada del módulo

Crea `modules/queue/variables.tf`.

### 20.1. Tipo y defaults

```hcl
variable "queue" {
  description = "Contrato de configuración para una cola estándar."
  nullable    = false

  type = object({
    name                       = string
    visibility_timeout_seconds = optional(number, 60)
    retention_seconds          = optional(number, 86400)
    tags                       = optional(map(string), {})

    dlq = optional(object({
      max_receive_count = optional(number, 5)
      retention_seconds = optional(number, 1209600)
    }))
  })
```

### 20.2. Archivo incompleto

El bloque se completa con las validaciones de las secciones siguientes.

### 20.3. Activación

Proporcionar un objeto `dlq`, incluso vacío, activa la DLQ con defaults.

---

## 21. Validaciones de identidad y visibilidad

Añade estos bloques dentro de la variable `queue`.

### 21.1. Reglas

```hcl
  validation {
    condition     = can(regex("^[A-Za-z0-9_-]{3,60}$", var.queue.name))
    error_message = "El nombre debe tener entre 3 y 60 caracteres alfanuméricos, guiones o guiones bajos."
  }

  validation {
    condition = (
      var.queue.visibility_timeout_seconds >= 0 &&
      var.queue.visibility_timeout_seconds <= 43200 &&
      floor(var.queue.visibility_timeout_seconds) == var.queue.visibility_timeout_seconds
    )
    error_message = "La visibilidad debe ser un entero entre 0 y 43200."
  }
```

### 21.2. Alcance

La expresión del nombre excluye `.fifo`.

### 21.3. Margen

El límite de 60 caracteres deja espacio para añadir `-dlq`.

---

## 22. Validaciones de retención y DLQ

Completa la variable y cierra el bloque.

### 22.1. Reglas

```hcl
  validation {
    condition = (
      var.queue.retention_seconds >= 60 &&
      var.queue.retention_seconds <= 1209600 &&
      floor(var.queue.retention_seconds) == var.queue.retention_seconds
    )
    error_message = "La retención principal debe ser un entero entre 60 y 1209600."
  }

  validation {
    condition = var.queue.dlq == null ? true : (
      var.queue.dlq.max_receive_count >= 1 &&
      var.queue.dlq.max_receive_count <= 1000 &&
      floor(var.queue.dlq.max_receive_count) == var.queue.dlq.max_receive_count &&
      var.queue.dlq.retention_seconds >= var.queue.retention_seconds &&
      var.queue.dlq.retention_seconds <= 1209600 &&
      floor(var.queue.dlq.retention_seconds) == var.queue.dlq.retention_seconds
    )
    error_message = "La DLQ necesita un umbral entero válido y retención entera no menor que la principal."
  }
}
```

---

## 23. Por qué utilizamos una condición ternaria

Una referencia a un objeto opcional requiere controlar su ausencia.

### 23.1. Patrón utilizado

```hcl
var.queue.dlq == null ? true : (...)
```

### 23.2. Propósito

Cuando no existe DLQ, no necesitamos validar sus atributos.

### 23.3. Precaución

No dependas de que una expresión booleana con `&&` evite siempre evaluar accesos a atributos de un valor nulo.

### 23.4. Regla

Utiliza una condición explícita para seleccionar la rama que corresponde a la presencia del objeto.

---

## 24. Recursos principales

Crea `modules/queue/main.tf`.

### 24.1. Cola y DLQ

```hcl
locals {
  dlq_enabled = var.queue.dlq != null
}

resource "aws_sqs_queue" "main" {
  name                       = var.queue.name
  visibility_timeout_seconds = var.queue.visibility_timeout_seconds
  message_retention_seconds  = var.queue.retention_seconds

  tags = merge(var.queue.tags, {
    QueueRole = "main"
  })
}

resource "aws_sqs_queue" "dlq" {
  count = local.dlq_enabled ? 1 : 0

  name = "${var.queue.name}-dlq"
  message_retention_seconds = (
    var.queue.dlq == null ? 1209600 : var.queue.dlq.retention_seconds
  )

  tags = merge(var.queue.tags, {
    QueueRole = "dlq"
  })
}
```

---

## 25. Políticas de redirección

Añade los recursos relacionados a `modules/queue/main.tf`.

### 25.1. Configuración

```hcl
resource "aws_sqs_queue_redrive_allow_policy" "dlq" {
  count     = local.dlq_enabled ? 1 : 0
  queue_url = aws_sqs_queue.dlq[0].id

  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue"
    sourceQueueArns   = [aws_sqs_queue.main.arn]
  })
}

resource "aws_sqs_queue_redrive_policy" "main" {
  count     = local.dlq_enabled ? 1 : 0
  queue_url = aws_sqs_queue.main.id

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq[0].arn
    maxReceiveCount = (
      var.queue.dlq == null ? 5 : var.queue.dlq.max_receive_count
    )
  })

  depends_on = [aws_sqs_queue_redrive_allow_policy.dlq]
}
```

---

## 26. Contrato de salida estructurado

Crea `modules/queue/outputs.tf`.

### 26.1. Output público

```hcl
output "contract" {
  description = "Contrato v1: identificadores, configuración efectiva y DLQ opcional."

  value = {
    contract_version = 1

    queue = {
      name                       = aws_sqs_queue.main.name
      url                        = aws_sqs_queue.main.id
      arn                        = aws_sqs_queue.main.arn
      visibility_timeout_seconds = var.queue.visibility_timeout_seconds
      retention_seconds          = var.queue.retention_seconds
    }

    dlq = local.dlq_enabled ? {
      name              = aws_sqs_queue.dlq[0].name
      url               = aws_sqs_queue.dlq[0].id
      arn               = aws_sqs_queue.dlq[0].arn
      max_receive_count = var.queue.dlq.max_receive_count
    } : null
  }
}
```

---

## 27. Qué representa la salida

El output combina identificadores observados y decisiones de configuración.

### 27.1. Identificadores

Nombre, URL y ARN proceden de los recursos administrados.

### 27.2. Configuración efectiva

Visibilidad, retención y umbral reflejan las entradas normalizadas del módulo.

### 27.3. Precaución

Publicar esas entradas no demuestra que una consulta posterior al servicio siga mostrando los mismos valores.

### 27.4. Versión del contrato

`contract_version = 1` documenta la interfaz; Terraform no aplica automáticamente reglas de versionado semántico.

---

## 28. Tipado de outputs

Los bloques `output` no admiten un argumento `type` equivalente al de las variables.

### 28.1. Inferencia

Terraform determina el tipo a partir de la expresión `value`.

### 28.2. Documentación

Debes explicar forma, significado, valores opcionales y estabilidad del resultado.

### 28.3. Consumidor tipado

Otro módulo puede recibir ese output mediante una variable con tipo `object`.

### 28.4. Regla

Comprueba el contrato también desde el consumidor; no confíes únicamente en una descripción textual.

---

## 29. Requisitos y proveedor de la raíz

Crea `versions.tf` y `providers.tf`.

### 29.1. Requisitos

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

### 29.2. Proveedor local

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

---

## 30. Entradas de la configuración raíz

Crea `variables.tf` con identidad y opciones de sesión.

### 30.1. Declaraciones

```hcl
variable "suffix" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.suffix))
    error_message = "Usa entre 4 y 8 caracteres alfanuméricos."
  }
}

variable "jobs_visibility" {
  type    = number
  default = 60
}

variable "enable_jobs_dlq" {
  type    = bool
  default = true
}
```

### 30.2. Validación delegada

El módulo comprobará que `jobs_visibility` respeta sus restricciones.

---

## 31. Consumir el módulo

Crea `main.tf` con dos llamadas explícitas.

### 31.1. Composición

```hcl
module "jobs" {
  source = "./modules/queue"

  queue = {
    name                       = "curso-contract-${var.suffix}-jobs"
    visibility_timeout_seconds = var.jobs_visibility
    dlq                        = var.enable_jobs_dlq ? {} : null
    tags = {
      Laboratory = "LocalStack"
      Component  = "jobs"
    }
  }
}

module "audit" {
  source = "./modules/queue"

  queue = {
    name = "curso-contract-${var.suffix}-audit"
    tags = {
      Laboratory = "LocalStack"
      Component  = "audit"
    }
  }
}
```

---

## 32. Entradas y outputs raíz

Crea `terraform.tfvars` y `outputs.tf`.

### 32.1. Entradas

```hcl
suffix          = "alumno01"
jobs_visibility = 60
enable_jobs_dlq = true
```

### 32.2. Resultados publicados

```hcl
output "contracts" {
  description = "Contratos públicos de los componentes del laboratorio."

  value = {
    jobs  = module.jobs.contract
    audit = module.audit.contract
  }
}
```

### 32.3. Diferencia

El output del módulo hijo se consulta desde la raíz mediante su expresión.

`terraform output` presenta las salidas raíz registradas en el estado.

---

## 33. Sesión 1: validar y revisar

Duración orientativa: 25 minutos.

### 33.1. Secuencia

```bash
terraform init
terraform fmt -recursive
terraform validate
terraform workspace show
terraform providers

terraform plan -out=planes/create.tfplan
terraform show planes/create.tfplan
```

### 33.2. Resultado esperado

El workspace debe ser `default`.

El plan debe crear cinco recursos administrados: tres colas y dos políticas.

### 33.3. Revisión

Comprueba nombres, defaults y ausencia de DLQ para `audit`.

---

## 34. Sesión 2: aplicar e inspeccionar

La aplicación materializa los contratos configurados.

### 34.1. Comandos

```bash
terraform apply planes/create.tfplan
terraform state list
terraform output -json contracts \
  > resultados/contracts-initial.json
```

### 34.2. Identificadores

```bash
JOBS_URL="$(jq -er '.jobs.queue.url' resultados/contracts-initial.json)"
JOBS_DLQ="$(jq -er '.jobs.dlq.url' resultados/contracts-initial.json)"
AUDIT_URL="$(jq -er '.audit.queue.url' resultados/contracts-initial.json)"
```

### 34.3. Resultado

`jobs.dlq` contiene un objeto.

`audit.dlq` debe ser `null`.

---

## 35. Sesión 3: comprobar defaults

Los valores efectivos deben coincidir con la interfaz documentada.

### 35.1. Inspección

```bash
jq '{
  jobs: .jobs.queue,
  audit: .audit.queue,
  jobs_dlq: .jobs.dlq,
  audit_dlq: .audit.dlq
}' resultados/contracts-initial.json
```

### 35.2. Expectativas

La retención principal será 86400 en ambas instancias.

La visibilidad de auditoría será 60.

La DLQ utilizará un umbral de cinco recepciones.

### 35.3. Regla

Omitir un atributo significa aceptar una decisión predeterminada del módulo.

---

## 36. Sesión 4: contrastar con SQS

La salida Terraform no sustituye una verificación independiente.

### 36.1. Consultas

```bash
aws_local sqs get-queue-attributes \
  --queue-url "$JOBS_URL" \
  --attribute-names All \
  > resultados/jobs-service.json

aws_local sqs get-queue-attributes \
  --queue-url "$AUDIT_URL" \
  --attribute-names All \
  > resultados/audit-service.json
```

### 36.2. Comparación

Comprueba visibilidad, retención y política de redirección.

### 36.3. Formato

SQS devuelve muchos atributos como cadenas y sus políticas como JSON serializado.

---

## 37. Sesión 5: validación negativa

Una entrada semánticamente inválida debe rechazarse.

### 37.1. Archivo de prueba

Crea `examples/invalid-visibility.tfvars`:

```hcl
jobs_visibility = -1
```

### 37.2. Ejecución

```bash
terraform plan \
  -var-file=examples/invalid-visibility.tfvars
```

### 37.3. Resultado esperado

La validación de `queue` debe rechazar el valor.

### 37.4. Precaución

No apliques un plan parcial ni elimines la validación para continuar la sesión.

---

## 38. Sesión 6: valores nulos y opcionales

Comprueba la diferencia entre activar una configuración y omitirla.

### 38.1. Variante sin DLQ

```bash
terraform plan \
  -var='enable_jobs_dlq=false' \
  -out=planes/disable-dlq-review.tfplan
```

### 38.2. Observación

El plan propone retirar las políticas y destruir la DLQ de trabajos.

### 38.3. No aplicar inicialmente

Este plan demuestra una consecuencia del contrato.

### 38.4. Regla

`null` puede representar una decisión destructiva cuando elimina infraestructura previamente existente.

---

## 39. Sesión 7: modificar un atributo compatible

Un cambio de configuración puede conservar estructura e identidad.

### 39.1. Cambio

Establece `jobs_visibility = 90` en `terraform.tfvars`.

### 39.2. Secuencia

```bash
terraform plan -out=planes/update-jobs.tfplan
terraform show planes/update-jobs.tfplan
terraform apply planes/update-jobs.tfplan
```

### 39.3. Resultado esperado

Se actualiza la cola principal de trabajos sin reemplazo.

### 39.4. Verificación

Su URL permanece igual y auditoría conserva 60 segundos.

---

## 40. Valores conocidos y desconocidos

No todos los resultados están disponibles durante el plan inicial.

### 40.1. Conocidos normalmente

El nombre derivado de entradas y los defaults pueden conocerse antes de crear recursos.

### 40.2. Desconocidos inicialmente

URL y ARN pueden aparecer como valores conocidos después de aplicar.

### 40.3. Consecuencia

Una prueba de planificación no puede exigir siempre identificadores todavía desconocidos.

### 40.4. Regla

Divide las expectativas entre configuración comprobable en plan y resultados verificables después de aplicar.

---

## 41. Pruebas declarativas del contrato

Crea `tests/contract.tftest.hcl`.

### 41.1. Plan válido

```hcl
run "valid_contract" {
  command = plan

  variables {
    suffix          = "test01"
    jobs_visibility = 60
    enable_jobs_dlq = true
  }

  assert {
    condition     = output.contracts.jobs.contract_version == 1
    error_message = "El módulo debe publicar la versión 1 del contrato."
  }

  assert {
    condition     = output.contracts.audit.dlq == null
    error_message = "Audit no debe publicar una DLQ inexistente."
  }

  assert {
    condition     = output.contracts.jobs.queue.retention_seconds == 86400
    error_message = "La retención predeterminada no coincide con el contrato."
  }
}
```

---

## 42. Prueba directa de validación

Añade otra ejecución al archivo de pruebas.

### 42.1. Entrada inválida del módulo

```hcl
run "reject_invalid_visibility" {
  command = plan

  module {
    source = "./modules/queue"
  }

  variables {
    queue = {
      name                       = "curso-contract-invalid"
      visibility_timeout_seconds = -1
    }
  }

  expect_failures = [var.queue]
}
```

### 42.2. Propósito

La prueba espera el rechazo de la validación, no una creación fallida en SQS.

---

## 43. Sesión 8: ejecutar las pruebas

Las pruebas permiten detectar cambios accidentales en la interfaz.

### 43.1. Comandos

```bash
terraform fmt -recursive
terraform validate
terraform test
```

### 43.2. Alcance

Estas ejecuciones solicitan planes, no aplicaciones.

Terraform utiliza contextos de prueba separados del estado habitual.

### 43.3. Proveedor

No utilizamos mocks; conserva LocalStack disponible.

### 43.4. Límite

Una prueba de plan no demuestra redirección efectiva, rendimiento ni cumplimiento de IAM.

---

## 44. Prueba funcional mínima

Verifica que un consumidor puede utilizar la URL publicada.

### 44.1. Envío y recepción

```bash
aws_local sqs send-message \
  --queue-url "$JOBS_URL" \
  --message-body '{"marker":"CONTRACT-001"}' \
  > resultados/message-sent.json

aws_local sqs receive-message \
  --queue-url "$JOBS_URL" \
  --max-number-of-messages 1 \
  --wait-time-seconds 5 \
  > resultados/message-received.json
```

### 44.2. Confirmación

Obtén el `ReceiptHandle` recibido y elimina ese mensaje mediante `delete-message`.

### 44.3. Regla

Terraform administra infraestructura; la confirmación pertenece al consumidor.

---

## 45. Preconditions y postconditions

Estas comprobaciones complementan el tipado y las validaciones.

### 45.1. Precondition

Puede expresar una relación que debe cumplirse antes de actuar sobre un recurso.

### 45.2. Postcondition

Puede comprobar atributos observados después de su evaluación.

### 45.3. Outputs

Un output también puede incluir una precondition apropiada.

### 45.4. Diferencia

Una validación de variable examina entradas; una condición de recurso puede examinar contexto o resultados del proveedor.

### 45.5. Regla

Coloca cada regla donde su información esté disponible y su error resulte comprensible.

---

## 46. Outputs sensibles

Una marca de sensibilidad modifica la presentación, no cifra automáticamente los datos.

### 46.1. Ejemplo conceptual

```hcl
output "training_value" {
  value     = "FAKE-NOT-A-SECRET"
  sensitive = true
}
```

### 46.2. Precaución

Determinadas salidas JSON o consultas explícitas pueden revelar valores sensibles.

El estado también puede conservarlos.

### 46.3. Laboratorio

No necesitas añadir ese output ni utilizar secretos reales.

### 46.4. Regla

Protege estado, planes y exports independientemente de cómo Terraform muestre los valores.

---

## 47. Compatibilidad de entradas

Un contrato puede evolucionar sin romper necesariamente a sus consumidores.

### 47.1. Cambios normalmente compatibles

Añadir una entrada opcional con un default coherente puede conservar llamadas existentes.

### 47.2. Cambios potencialmente incompatibles

Eliminar atributos, cambiar tipos o convertir opciones en obligatorias puede romper consumidores.

### 47.3. Defaults

Cambiar un default puede modificar infraestructura aunque las llamadas sigan siendo sintácticamente válidas.

### 47.4. Regla

Evalúa compatibilidad sintáctica y consecuencias operacionales por separado.

---

## 48. Compatibilidad de outputs

Los consumidores pueden depender de nombres, forma y significado.

### 48.1. Ejemplos incompatibles

Renombrar `queue.url` a `queue.endpoint` rompe expresiones existentes.

Cambiar `dlq = null` por un objeto vacío cambia su semántica.

### 48.2. Adiciones

Añadir un atributo puede ser compatible, pero ciertos consumidores comparan estructuras completas.

### 48.3. Versionado

Documenta cambios y rutas de adaptación.

### 48.4. Regla

No declares compatibilidad únicamente porque Terraform acepta la nueva configuración.

---

## 49. Direcciones y migraciones internas

La estabilidad del contrato no resuelve automáticamente los cambios de dirección.

### 49.1. Ejemplo

Renombrar `aws_sqs_queue.main` dentro del módulo altera una dirección registrada.

### 49.2. Migración

Un bloque `moved` puede conservar la relación con el objeto existente.

### 49.3. Outputs

El consumidor puede seguir utilizando `contract.queue.url`.

### 49.4. Regla

Mantén la interfaz y migra el estado cuando corresponda; son responsabilidades relacionadas, pero distintas.

---

## 50. Documentación del contrato

Crea `modules/queue/README.md` con información útil para consumidores.

### 50.1. Contenido mínimo

Incluye propósito, versiones, forma de `queue`, defaults y validaciones.

Documenta la forma de `contract` y el significado de `dlq = null`.

### 50.2. Consecuencias

Explica que desactivar DLQ puede eliminar mensajes.

### 50.3. Límites

Aclara ausencia de FIFO, consumidores, permisos y alarmas.

### 50.4. Regla

La documentación debe describir decisiones y riesgos, no solo enumerar nombres de variables.

---

## 51. Diagnóstico de problemas frecuentes

Investiga primero la capa que produce el error.

### 51.1. Lista de revisión

Comprueba:

- Atributo obligatorio ausente.
- Error de escritura en un atributo opcional.
- Tipo incompatible.
- Valor nulo no admitido.
- Acceso a una DLQ inexistente.
- Output no publicado.
- Default interpretado incorrectamente.
- Endpoint o región incorrectos.
- Estado o workspace equivocado.

### 51.2. Regla

No importes recursos ni retires relaciones para corregir un simple error de interfaz.

---

## 52. Diferencias respecto a AWS real

La emulación permite comprobar configuración e integración, no certificar producción.

### 52.1. Aspectos adicionales

Revisa IAM, cifrado, cuotas, costes, auditoría y recuperación de mensajes.

### 52.2. Semántica

La redirección y los errores del servicio deben validarse en la imagen utilizada.

### 52.3. Persistencia

Eliminar LocalStack puede hacer desaparecer colas mientras Terraform conserva sus relaciones.

### 52.4. Regla

El contrato debe separar garantías comprobadas de expectativas que requieren validación externa.

---

## 53. Limpieza del laboratorio

Mantén LocalStack disponible durante la destrucción.

### 53.1. Secuencia revisada

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

### 53.2. Datos

La destrucción elimina las colas y sus mensajes pendientes.

### 53.3. Precaución

Borrar el directorio o el estado no sustituye este procedimiento.

---

## 54. Ejercicios y evaluación

La evaluación debe demostrar un contrato comprensible y verificable.

### 54.1. Ejercicios

1. Explica ausencia, `null` y objeto vacío.
2. Comprueba defaults mediante plan y API.
3. Añade una validación con un mensaje útil.
4. Prueba una entrada incompatible.
5. Modifica trabajos sin alterar auditoría.
6. Documenta un cambio incompatible de output.
7. Diseña una migración interna conservando la interfaz.
8. Destruye y verifica todos los recursos.

### 54.2. Entrega

Incluye módulo, composición raíz, documentación, pruebas y evidencias del servicio.

---

## 55. Resumen de la lección

Un contrato de módulo combina estructura, significado y consecuencias operacionales.

### 55.1. Ideas esenciales

- Los tipos delimitan entradas, pero no sustituyen reglas semánticas.
- Los defaults representan decisiones.
- Los atributos opcionales necesitan una interpretación explícita.
- Los outputs forman una interfaz pública.
- Los valores desconocidos condicionan las pruebas.
- La sensibilidad no cifra automáticamente el estado.
- La compatibilidad incluye efectos sobre infraestructura.
- La verificación del servicio complementa las pruebas de Terraform.

### 55.2. Procedimiento recomendado

Define la interfaz, valida sus reglas, prueba expectativas y comprueba resultados independientes.

### 55.3. Idea final

**Un módulo fiable ofrece un contrato que los consumidores pueden entender, utilizar y verificar sin depender accidentalmente de su implementación interna.**