# Validaciones, precondiciones y postcondiciones con Terraform y LocalStack

Una configuración Terraform fiable no solo describe recursos: también expresa las reglas que deben cumplir sus entradas, sus dependencias y sus resultados.

Las validaciones permiten rechazar valores incorrectos antes de utilizarlos.

Las precondiciones comprueban requisitos del contexto en el que se administra un recurso.

Las postcondiciones verifican propiedades de los resultados que Terraform obtiene.

Estas herramientas reducen errores, pero no sustituyen las pruebas funcionales ni garantizan una reversión automática cuando una operación falla.

En esta lección construirás un módulo SQS con contratos verificables y practicarás errores controlados mediante LocalStack.

También ejecutarás un laboratorio separado para observar una postcondición que falla después de crear un recurso.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues AWS de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Los experimentos negativos deben ejecutarse en los directorios indicados.
>
> Una postcondición fallida no garantiza rollback de la infraestructura.

---

## 1. Objetivos de aprendizaje

Esta lección transforma restricciones de diseño en contratos ejecutables.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Diseñar validaciones de variables.
- Formular precondiciones entre entradas relacionadas.
- Utilizar `self` en postcondiciones.
- Diferenciar valores conocidos y desconocidos.
- Interpretar fallos durante plan y apply.
- Escribir pruebas con `terraform test`.
- Comprobar recursos mediante AWS CLI.
- Recuperar un laboratorio después de una condición fallida.

### 1.2. Resultado práctico

Crearás una cola SQS cuyo contrato limita nombres, tiempos y relaciones entre parámetros.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos de módulos, estado y planes.

### 2.1. Herramientas

Comprueba:

```bash
terraform version
docker version
docker compose version
aws --version
python3 --version
jq --version
```

### 2.2. Versiones utilizadas

Utilizaremos Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se limita a la serie 5.x.

---

## 3. Compatibilidad del laboratorio

El docente debe validar la combinación concreta antes de distribuir la práctica.

### 3.1. Operaciones necesarias

Comprueba:

- Creación y actualización de colas SQS.
- Lectura de atributos y etiquetas.
- Validaciones de variables.
- Precondiciones y postcondiciones.
- Ejecución de `terraform test`.
- Uso del recurso integrado `terraform_data`.
- Destrucción de ambos laboratorios.

### 3.2. Registro del entorno

Documenta Terraform, proveedor AWS, AWS CLI e imagen o digest de LocalStack.

---

## 4. Las tres herramientas principales

Cada mecanismo responde a una pregunta diferente.

### 4.1. Comparación

| **Mecanismo** | **Pregunta** | **Ubicación habitual** |
|---------------|--------------|-------------------------|
| Validación | ¿Esta entrada es aceptable? | Bloque `variable` |
| Precondición | ¿Se cumplen los requisitos? | `lifecycle` de un recurso |
| Postcondición | ¿El resultado cumple el contrato? | `lifecycle` de un recurso |

La elección depende del origen de la información.

### 4.2. Regla principal

**Comprueba una propiedad en el punto donde dispones de información suficiente para evaluarla.**

---

## 5. Validación de variables

Una validación expresa requisitos sobre una entrada del módulo.

### 5.1. Ejemplo sencillo

```hcl
variable "environment" {
  type = string

  validation {
    condition     = contains(["lab", "test"], var.environment)
    error_message = "El entorno debe ser lab o test."
  }
}
```

### 5.2. Propósito

El mensaje explica cómo corregir la entrada, no solo que existe un error.

---

## 6. Precondiciones

Una precondición expresa un requisito previo de un recurso o data source.

### 6.1. Ejemplo conceptual

```hcl
lifecycle {
  precondition {
    condition     = var.retention_seconds > var.visibility_seconds
    error_message = "La retención debe superar la visibilidad."
  }
}
```

### 6.2. Alcance

Puede relacionar entradas y otros objetos disponibles en su contexto.

### 6.3. Precaución

Si la condición depende de valores desconocidos, su evaluación puede diferirse.

---

## 7. Postcondiciones

Una postcondición comprueba propiedades del resultado de un recurso o data source.

### 7.1. Ejemplo conceptual

```hcl
lifecycle {
  postcondition {
    condition     = startswith(self.arn, "arn:aws:sqs:")
    error_message = "El recurso debe publicar un ARN SQS."
  }
}
```

### 7.2. Propósito

`self` representa la instancia del recurso que contiene la postcondición.

### 7.3. Regla

No utilices `self` dentro de una precondición como si el resultado ya existiera.

---

## 8. Versiones y compatibilidad de expresiones

La sintaxis disponible depende de la versión de Terraform.

### 8.1. Decisiones de esta página

Las validaciones utilizarán únicamente la variable que están validando.

Las relaciones entre variables distintas se comprobarán mediante precondiciones.

### 8.2. Motivo

Este diseño es compatible con el mínimo Terraform 1.6 del laboratorio.

### 8.3. Versiones recientes

Terraform 1.9 amplió las referencias permitidas en validaciones de variables.

### 8.4. Regla

No copies expresiones de una versión posterior sin comprobar el requisito mínimo del módulo.

---

## 9. Contratos y tipos

El tipo comprueba la forma general; las condiciones comprueban reglas adicionales.

### 9.1. Ejemplos

Un `number` puede seguir siendo negativo.

Un `string` puede estar vacío.

Un objeto puede contener tiempos incompatibles entre sí.

### 9.2. Regla

Utiliza tipos para estructura y validaciones para restricciones de dominio.

### 9.3. Precaución

Una validación no sustituye un contrato de tipos claro.

---

## 10. Restricciones del servicio y del curso

No todas las reglas del módulo provienen de AWS.

### 10.1. Comparación

| **Regla** | **Origen** | **Interpretación** |
|-----------|------------|--------------------|
| Retención dentro del rango SQS | Servicio | Límite técnico |
| Nombre con prefijo `curso-` | Laboratorio | Convención educativa |
| Retención mayor que presupuesto de procesamiento | Módulo | Política de diseño |
| ARN correspondiente a la cola | Resultado | Invariante estructural |

Documenta el origen de cada restricción.

### 10.2. Regla

No presentes una política del curso como un requisito universal de AWS.

---

## 11. Cuándo se evalúan las condiciones

La evaluación depende de cuándo Terraform conoce sus valores.

### 11.1. Valores conocidos

Una entrada literal suele estar disponible durante el plan.

### 11.2. Valores desconocidos

Un ARN calculado puede no conocerse hasta crear el recurso.

### 11.3. Consecuencia

Una condición válida durante la planificación puede quedar pendiente de evaluación.

### 11.4. Regla

Un plan sin errores no demuestra que todas las condiciones hayan terminado de evaluarse.

---

## 12. `terraform validate` no ejecuta toda la práctica

La validación de configuración y la evaluación operacional son actividades diferentes.

### 12.1. Qué comprueba

`terraform validate` revisa sintaxis y consistencia interna de la configuración.

### 12.2. Qué no debes asumir

No sustituye un plan con las entradas reales.

No crea recursos para conocer atributos calculados.

No demuestra entrega de mensajes SQS.

### 12.3. Regla

Utiliza validate, plan, apply y pruebas funcionales como capas complementarias.

---

## 13. Fallos y cambios parciales

Terraform no opera como una transacción global sobre todos los servicios.

### 13.1. Precondición diferida

Puede fallar cuando otros recursos ya han cambiado.

### 13.2. Postcondición

Puede fallar después de una lectura o una modificación.

### 13.3. Consecuencia

El comando puede terminar con error y dejar recursos administrados existentes.

### 13.4. Regla principal

**Después de un fallo, investiga estado e infraestructura antes de repetir o destruir.**

---

## 14. Arquitectura del laboratorio

Separaremos el módulo SQS y el experimento de postcondición fallida.

### 14.1. Organización

```text
Proyecto app
    └── Módulo queue
         ├── Validaciones de entrada
         ├── Precondiciones
         ├── Cola SQS en LocalStack
         └── Postcondiciones

Proyecto post-lab
    └── terraform_data
         └── Postcondición diferida y fallo controlado
```

### 14.2. Estado

Cada proyecto conservará su propio estado local.

---

## 15. Preparación del directorio

Trabaja en una carpeta independiente.

### 15.1. Estructura

```bash
mkdir -p terraform-contracts/app
mkdir -p terraform-contracts/modules/queue
mkdir -p terraform-contracts/tests
mkdir -p terraform-contracts/post-lab
mkdir -p terraform-contracts/planes
mkdir -p terraform-contracts/resultados
mkdir -p terraform-contracts/copias
cd terraform-contracts
```

### 15.2. Ejecución

Los comandos se ejecutan desde esta raíz salvo indicación expresa.

---

## 16. Protección de archivos

Separa configuración y artefactos operativos.

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

Versiona módulos, pruebas, documentación y archivos de bloqueo de proveedores.

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

---

## 18. Credenciales y conectividad

Prepara la terminal con valores ficticios y un endpoint explícito.

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
  aws --endpoint-url=http://127.0.0.1:4566 --region us-east-1 "$@"
}
```

### 18.2. Comprobación

Ejecuta `aws_local sqs list-queues` antes de continuar.

---

## 19. Requisitos del módulo

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

El módulo heredará la configuración AWS desde el proyecto raíz.

---

## 20. Variable estructurada de cola

Crea `modules/queue/variables.tf`.

### 20.1. Tipo e identidad

```hcl
variable "queue" {
  description = "Configuración de una cola estándar del laboratorio."
  nullable    = false

  type = object({
    name                       = string
    visibility_timeout_seconds = optional(number, 60)
    retention_seconds          = optional(number, 86400)
  })

  validation {
    condition = can(regex(
      "^[a-z][a-z0-9-]{2,59}$",
      var.queue.name
    ))
    error_message = "El nombre debe tener entre 3 y 60 caracteres: minúsculas, dígitos y guiones."
  }
```

### 20.2. Continuación

Completa la variable con las validaciones de tiempos de la siguiente sección.

---

## 21. Validaciones de tiempos SQS

Añade los bloques y cierra la variable `queue`.

### 21.1. Rangos e integridad

```hcl
  validation {
    condition = (
      var.queue.visibility_timeout_seconds >= 0 &&
      var.queue.visibility_timeout_seconds <= 43200 &&
      floor(var.queue.visibility_timeout_seconds) == var.queue.visibility_timeout_seconds
    )
    error_message = "La visibilidad debe ser un entero entre 0 y 43200 segundos."
  }

  validation {
    condition = (
      var.queue.retention_seconds >= 60 &&
      var.queue.retention_seconds <= 1209600 &&
      floor(var.queue.retention_seconds) == var.queue.retention_seconds
    )
    error_message = "La retención debe ser un entero entre 60 y 1209600 segundos."
  }
}
```

### 21.2. Propósito

Estas reglas rechazan valores fuera del dominio antes de solicitar una cola.

---

## 22. Presupuesto de procesamiento

Añade otra variable a `modules/queue/variables.tf`.

### 22.1. Declaración

```hcl
variable "processing_budget_seconds" {
  description = "Presupuesto máximo de procesamiento definido por el curso."
  type        = number
  default     = 30
  nullable    = false

  validation {
    condition = (
      var.processing_budget_seconds >= 1 &&
      var.processing_budget_seconds <= 43200 &&
      floor(var.processing_budget_seconds) == var.processing_budget_seconds
    )
    error_message = "El presupuesto debe ser un entero entre 1 y 43200 segundos."
  }
}
```

### 22.2. Regla

Este presupuesto es una decisión del módulo, no una propiedad que SQS mida.

---

## 23. Recurso y precondiciones

Crea `modules/queue/main.tf`.

### 23.1. Requisitos previos

```hcl
resource "aws_sqs_queue" "this" {
  name                       = var.queue.name
  visibility_timeout_seconds = var.queue.visibility_timeout_seconds
  message_retention_seconds  = var.queue.retention_seconds

  tags = {
    Laboratory = "LocalStack"
    ManagedBy  = "Terraform"
  }

  lifecycle {
    precondition {
      condition     = startswith(var.queue.name, "curso-")
      error_message = "Las colas del laboratorio deben comenzar por curso-."
    }

    precondition {
      condition     = var.queue.visibility_timeout_seconds >= var.processing_budget_seconds
      error_message = "La visibilidad debe cubrir el presupuesto de procesamiento."
    }

    precondition {
      condition     = var.queue.retention_seconds > var.processing_budget_seconds
      error_message = "La retención debe superar el presupuesto de procesamiento."
    }
```

### 23.2. Continuación

Añade las postcondiciones antes de cerrar `lifecycle` y el recurso.

---

## 24. Postcondiciones del recurso

Completa `modules/queue/main.tf`.

### 24.1. Invariantes del resultado

```hcl
    postcondition {
      condition = (
        startswith(self.arn, "arn:aws:sqs:us-east-1:") &&
        endswith(self.arn, ":${var.queue.name}")
      )
      error_message = "El ARN debe corresponder a la cola del laboratorio en us-east-1."
    }

    postcondition {
      condition     = self.visibility_timeout_seconds == var.queue.visibility_timeout_seconds
      error_message = "La visibilidad publicada por el proveedor no coincide con la configuración."
    }

    postcondition {
      condition     = self.message_retention_seconds == var.queue.retention_seconds
      error_message = "La retención publicada por el proveedor no coincide con la configuración."
    }
  }
}
```

### 24.2. Alcance

Estas condiciones comprueban atributos expuestos por el proveedor, no el rendimiento del consumidor.

---

## 25. Outputs del módulo

Crea `modules/queue/outputs.tf`.

### 25.1. Contrato público

```hcl
output "contract" {
  value = {
    name                       = aws_sqs_queue.this.name
    url                        = aws_sqs_queue.this.id
    arn                        = aws_sqs_queue.this.arn
    visibility_timeout_seconds = aws_sqs_queue.this.visibility_timeout_seconds
    retention_seconds          = aws_sqs_queue.this.message_retention_seconds
  }
}
```

### 25.2. Encapsulación

La raíz consumirá este contrato sin acceder a recursos internos del módulo.

### 25.3. Regla

Un output no sustituye una consulta independiente del servicio.

---

## 26. Requisitos y proveedor raíz

Crea `app/versions.tf` y `app/providers.tf`.

### 26.1. Requisitos

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

### 26.2. Proveedor local

```hcl
provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    sqs = "http://127.0.0.1:4566"
  }
}
```

---

## 27. Composición raíz

Crea `app/variables.tf` y `app/main.tf`.

### 27.1. Entradas raíz

```hcl
variable "queue" {
  type = object({
    name                       = string
    visibility_timeout_seconds = optional(number, 60)
    retention_seconds          = optional(number, 86400)
  })
}

variable "processing_budget_seconds" {
  type    = number
  default = 30
}
```

### 27.2. Llamada al módulo

```hcl
module "queue" {
  source                    = "../modules/queue"
  queue                     = var.queue
  processing_budget_seconds = var.processing_budget_seconds
}
```

---

## 28. Valores y resultados raíz

Crea `app/terraform.tfvars` y `app/outputs.tf`.

### 28.1. Configuración inicial

```hcl
queue = {
  name                       = "curso-contracts-alumno01"
  visibility_timeout_seconds = 60
  retention_seconds          = 86400
}

processing_budget_seconds = 30
```

### 28.2. Output

```hcl
output "queue" {
  value = module.queue.contract
}
```

### 28.3. Entorno compartido

Cada alumno debe utilizar un nombre diferente.

---

## 29. Sesión 1: desplegar el caso válido

Duración orientativa: 25 minutos.

### 29.1. Secuencia

```bash
terraform -chdir=app init
terraform -chdir=app fmt -recursive
terraform -chdir=app validate

terraform -chdir=app plan -out=../planes/create.tfplan
terraform -chdir=app show ../planes/create.tfplan
terraform -chdir=app apply ../planes/create.tfplan
```

### 29.2. Resultado esperado

Se crea una cola sin fallos de condiciones.

### 29.3. Observación

El ARN calculado permite completar la postcondición cuando está disponible.

---

## 30. Sesión 2: verificación independiente

Consulta los atributos mediante AWS CLI.

### 30.1. Comandos

```bash
terraform -chdir=app output -json queue > resultados/queue.json
QUEUE_URL="$(jq -er '.url' resultados/queue.json)"

aws_local sqs get-queue-attributes \
  --queue-url "$QUEUE_URL" \
  --attribute-names QueueArn VisibilityTimeout MessageRetentionPeriod \
  > resultados/queue-attributes.json
```

### 30.2. Resultado esperado

Visibilidad 60 y retención 86400.

### 30.3. Regla

Las consultas AWS CLI complementan las postcondiciones basadas en atributos del proveedor.

---

## 31. Sesión 3: entrada inválida

Utiliza argumentos ficticios para demostrar rechazo sin modificar el archivo principal.

### 31.1. Prueba

```bash
terraform -chdir=app plan \
  -var='queue={name="curso-contracts-alumno01",visibility_timeout_seconds=-1,retention_seconds=86400}'
```

### 31.2. Resultado esperado

La validación del módulo rechaza la visibilidad negativa.

### 31.3. Estado

No debe aplicarse ningún cambio.

### 31.4. Regla

Un plan negativo puede producir varios diagnósticos; identifica la regla que querías comprobar.

---

## 32. Sesión 4: precondición incumplida

El valor puede ser válido para SQS y aun así incumplir la política del módulo.

### 32.1. Prueba

```bash
terraform -chdir=app plan \
  -var='processing_budget_seconds=90'
```

### 32.2. Resultado esperado

La precondición informa que la visibilidad no cubre el presupuesto.

### 32.3. Interpretación

90 es una entrada válida del presupuesto, pero su relación con visibilidad 60 es incompatible.

### 32.4. Regla

Esta prueba diferencia validación individual y requisito entre entradas.

---

## 33. Sesión 5: convención de nombres

La identidad también puede formar parte del contrato.

### 33.1. Prueba

```bash
terraform -chdir=app plan \
  -var='queue={name="externa-alumno01",visibility_timeout_seconds=60,retention_seconds=86400}'
```

### 33.2. Resultado esperado

La precondición rechaza el prefijo.

### 33.3. Diferencia

El nombre cumple la forma general de la variable, pero no la convención del laboratorio.

### 33.4. Regla

No aplique el plan negativo ni cambies el recurso para demostrar el fallo.

---

## 34. Mensajes de error útiles

Un mensaje debe permitir corregir la configuración sin abrir toda la implementación.

### 34.1. Recomendaciones

Indica la propiedad incorrecta y el requisito esperado.

Evita mensajes genéricos como “configuración inválida”.

No incluyas contraseñas, tokens ni contenido sensible.

### 34.2. Regla

El mensaje también forma parte de la interfaz del módulo.

### 34.3. Ejercicio

Reescribe una condición con un mensaje que explique su origen: AWS, curso o política de aplicación.

---

## 35. Pruebas automatizadas del módulo

`terraform test` permite expresar resultados esperados de planes y aplicaciones.

### 35.1. Ubicación

Utilizaremos el directorio `tests` de la raíz del laboratorio.

### 35.2. Selección

El comando indicará explícitamente ese directorio desde `app`.

### 35.3. Alcance

Las primeras pruebas ejecutarán planes, no aplicaciones.

### 35.4. Regla

Conserva LocalStack disponible porque no utilizaremos mocks del proveedor.

---

## 36. Prueba del contrato válido

Crea `tests/queue.tftest.hcl`.

### 36.1. Plan positivo

```hcl
run "valid_contract" {
  command = plan

  module {
    source = "../modules/queue"
  }

  variables {
    queue = {
      name                       = "curso-test-valid"
      visibility_timeout_seconds = 60
      retention_seconds          = 86400
    }
    processing_budget_seconds = 30
  }

  assert {
    condition     = output.contract.name == "curso-test-valid"
    error_message = "El módulo debe conservar el nombre solicitado."
  }

  assert {
    condition     = output.contract.visibility_timeout_seconds == 60
    error_message = "La visibilidad esperada es 60."
  }
}
```

---

## 37. Prueba negativa de variable

Añade otra ejecución al mismo archivo.

### 37.1. Rechazo esperado

```hcl
run "reject_negative_visibility" {
  command = plan

  module {
    source = "../modules/queue"
  }

  variables {
    queue = {
      name                       = "curso-test-invalid"
      visibility_timeout_seconds = -1
      retention_seconds          = 86400
    }
    processing_budget_seconds = 30
  }

  expect_failures = [
    var.queue,
    aws_sqs_queue.this,
  ]
}
```

### 37.2. Motivo

La entrada también puede incumplir la precondición de presupuesto; la prueba contempla ambos objetos.

---

## 38. Prueba negativa de precondición

Añade una ejecución que utiliza entradas individualmente válidas.

### 38.1. Rechazo de relación

```hcl
run "reject_short_visibility" {
  command = plan

  module {
    source = "../modules/queue"
  }

  variables {
    queue = {
      name                       = "curso-test-budget"
      visibility_timeout_seconds = 30
      retention_seconds          = 86400
    }
    processing_budget_seconds = 60
  }

  expect_failures = [aws_sqs_queue.this]
}
```

### 38.2. Resultado

La condición del recurso falla por la relación entre visibilidad y presupuesto.

---

## 39. Sesión 6: ejecutar pruebas

Las pruebas deben ejecutarse antes de publicar cambios en el módulo.

### 39.1. Comandos

```bash
terraform fmt -recursive
terraform -chdir=app validate
terraform -chdir=app test -test-directory=../tests
```

### 39.2. Resultado esperado

Las tres ejecuciones pasan porque los rechazos negativos son intencionados.

### 39.3. Límite

Una prueba de plan no puede demostrar una postcondición cuyo valor permanece desconocido.

### 39.4. Regla

No interpretes “test passed” como equivalencia entre todas las fases de evaluación.

---

## 40. Postcondición diferida: laboratorio separado

Ahora observarás un fallo después de obtener un resultado calculado.

### 40.1. Aislamiento

El directorio `post-lab` no crea recursos AWS.

Utiliza un recurso integrado de Terraform y un estado independiente.

### 40.2. Propósito

Demostrar que un fallo de postcondición puede dejar un recurso creado y registrado.

### 40.3. Regla

No mezcles este experimento con el estado de la cola.

---

## 41. Configuración del experimento

Crea `post-lab/main.tf`.

### 41.1. Postcondición sobre un resultado

```hcl
terraform {
  required_version = ">= 1.6.0, < 2.0.0"
}

variable "expected_status" {
  type    = string
  default = "ready"
}

resource "terraform_data" "probe" {
  input = {
    status = "ready"
  }

  lifecycle {
    postcondition {
      condition     = self.output.status == var.expected_status
      error_message = "El estado publicado no coincide con expected_status."
    }
  }
}

output "probe_id" {
  value = terraform_data.probe.id
}
```

---

## 42. Sesión 7: preparar el fallo diferido

La primera planificación parte de un recurso que todavía no existe.

### 42.1. Comandos

```bash
terraform -chdir=post-lab init

terraform -chdir=post-lab plan \
  -var='expected_status=blocked' \
  -out=../planes/post-failure.tfplan

terraform -chdir=post-lab show ../planes/post-failure.tfplan
```

### 42.2. Expectativa

`output` es un resultado calculado y la postcondición puede quedar pendiente hasta apply.

### 42.3. Regla

Si ya ejecutaste este experimento, su estado previo puede cambiar el momento del diagnóstico.

---

## 43. Sesión 8: aplicar el fallo controlado

El comando terminará con error, pero debes inspeccionar lo que ocurrió.

### 43.1. Captura

```bash
set +e
terraform -chdir=post-lab apply ../planes/post-failure.tfplan \
  > resultados/post-failure.stdout.txt \
  2> resultados/post-failure.stderr.txt
CODE=$?
set -e

printf '%s\n' "$CODE" > resultados/post-failure.exit.txt
terraform -chdir=post-lab state list
```

### 43.2. Resultado esperado

La postcondición falla y `terraform_data.probe` puede aparecer en el estado.

---

## 44. Interpretar el fallo de apply

La condición detecta una discrepancia, no revierte automáticamente lo ejecutado.

### 44.1. Evidencia

Revisa código de salida, diagnóstico y presencia del recurso.

### 44.2. Dependencias

Terraform impide continuar operaciones dependientes cuando corresponde a la condición fallida.

### 44.3. Límite

Otros recursos independientes podrían haber cambiado en una configuración más amplia.

### 44.4. Regla

No generalices este experimento de un recurso a una transacción completa de infraestructura.

---

## 45. Sesión 9: recuperar el experimento

Corrige la expectativa y vuelve a revisar la configuración.

### 45.1. Secuencia

```bash
terraform -chdir=post-lab plan \
  -var='expected_status=ready' \
  -out=../planes/post-recovery.tfplan

terraform -chdir=post-lab apply ../planes/post-recovery.tfplan

terraform -chdir=post-lab plan \
  -var='expected_status=ready'
```

### 45.2. Resultado esperado

La condición se satisface y el proyecto queda estable.

### 45.3. Regla

El plan de recuperación debe ser nuevo; no reutilices el plan que contenía la expectativa incorrecta.

---

## 46. Postcondiciones y observación independiente

Una postcondición opera sobre información expuesta al grafo de Terraform.

### 46.1. No demuestra automáticamente

Procesamiento correcto de mensajes.

Ausencia de duplicados.

Aplicación completa de IAM.

Rendimiento o disponibilidad de consumidores.

### 46.2. Regla

Utiliza pruebas del servicio y de la aplicación para propiedades que no aparecen en el esquema del recurso.

---

## 47. Sesión 10: prueba funcional SQS

Comprueba que la cola puede recibir un mensaje ficticio.

### 47.1. Envío y recepción

```bash
aws_local sqs send-message \
  --queue-url "$QUEUE_URL" \
  --message-body '{"event_id":"CONTRACT-001","purpose":"functional-check"}'

aws_local sqs receive-message \
  --queue-url "$QUEUE_URL" \
  --wait-time-seconds 5 \
  > resultados/message.json
```

### 47.2. Confirmación

Elimina el mensaje con el `ReceiptHandle` de esa recepción.

### 47.3. Regla

Esta prueba funcional complementa, pero no reemplaza, el contrato de configuración.

---

## 48. Deriva y lectura del recurso

Los atributos pueden cambiar fuera de Terraform.

### 48.1. Ejercicio controlado

Modifica la visibilidad mediante AWS CLI y revisa un nuevo plan.

### 48.2. Resultado posible

Una postcondición basada en datos refrescados puede denunciar la discrepancia.

La fase y el diagnóstico deben documentarse para el proveedor utilizado.

### 48.3. Recuperación

Restaura el atributo conocido mediante CLI si el contrato impide avanzar con normalidad.

### 48.4. Regla

No presupongas que una postcondición siempre permitirá planificar primero una reparación.

---

## 49. `check` no equivale a una condición bloqueante

Terraform también ofrece bloques `check` para comprobaciones adicionales.

### 49.1. Diferencia importante

Un fallo de `check` normalmente produce una advertencia y no bloquea la operación como una precondición o postcondición fallida.

### 49.2. Uso

Puede ser adecuado para observaciones continuas que no deben impedir el despliegue.

### 49.3. Regla

No utilices `check` como sustituto de una restricción que obligatoriamente debe rechazar entradas.

---

## 50. Expresiones robustas y errores frecuentes

Una condición debe evaluar una regla, no introducir errores innecesarios.

### 50.1. Recomendaciones

Utiliza `can` cuando una función pueda fallar al analizar una entrada.

No dependas de cortocircuitos lógicos para proteger accesos inválidos.

Controla valores `null` y colecciones vacías explícitamente.

Evita condiciones que repitan suposiciones sin observar nada nuevo.

### 50.2. Regla

Una postcondición demasiado rígida puede dificultar operaciones de recuperación legítimas.

---

## 51. Documentación y evolución del módulo

Las condiciones forman parte del contrato público y operacional.

### 51.1. README mínimo

Documenta entradas, defaults, rangos y relaciones.

Explica restricciones propias del curso.

Describe qué postcondiciones pueden diferirse.

### 51.2. Versionado

Añadir una restricción puede romper llamadas que antes eran válidas.

### 51.3. Regla

Revisa compatibilidad de comportamiento, no solo compatibilidad sintáctica.

---

## 52. Preparar la limpieza

Destruye cada proyecto desde su propio directorio y estado.

### 52.1. Evidencias

```bash
umask 077
terraform -chdir=app state pull > copias/app-before-destroy.tfstate
terraform -chdir=post-lab state pull > copias/post-before-destroy.tfstate
```

### 52.2. Condición previa

Recupera primero el experimento y cualquier deriva introducida.

### 52.3. Regla

No borres estados para evitar diagnósticos de condiciones.

---

## 53. Destruir ambos laboratorios

Mantén LocalStack disponible hasta eliminar la cola.

### 53.1. Proyecto principal

```bash
terraform -chdir=app plan -destroy -out=../planes/app-destroy.tfplan
terraform -chdir=app show ../planes/app-destroy.tfplan
terraform -chdir=app apply ../planes/app-destroy.tfplan
```

### 53.2. Experimento

```bash
terraform -chdir=post-lab plan -destroy \
  -var='expected_status=ready' \
  -out=../planes/post-destroy.tfplan

terraform -chdir=post-lab apply ../planes/post-destroy.tfplan
```

---

## 54. Verificación, diferencias y evaluación

El cierre debe demostrar ausencia de recursos y límites de las conclusiones.

### 54.1. Verificación final

```bash
terraform -chdir=app state list
terraform -chdir=post-lab state list
aws_local sqs list-queues
docker compose down
```

### 54.2. Diferencias respecto a AWS real

LocalStack no certifica IAM, tiempos de propagación ni rendimiento equivalente.

### 54.3. Entrega

Incluye código, pruebas, diagnósticos y evidencias de recuperación; excluye estados y planes.

---

## 55. Ejercicios y resumen de la lección

Las actividades deben demostrar comprensión de las distintas fases de evaluación.

### 55.1. Ejercicios

1. Rechaza una retención decimal.
2. Prueba un presupuesto mayor que la visibilidad.
3. Explica una condición diferida.
4. Demuestra un fallo posterior a la creación.
5. Recupera sin editar el estado.
6. Añade una prueba negativa de nombres.
7. Diferencia `check` y postcondición.
8. Destruye y verifica ambos proyectos.

### 55.2. Ideas esenciales

Validar entradas, comprobar requisitos y observar resultados son responsabilidades diferentes.

### 55.3. Idea final

**Un contrato Terraform fiable detecta errores donde dispone de información suficiente, explica cómo corregirlos y reconoce que una condición fallida no sustituye las pruebas funcionales ni garantiza una reversión automática.**