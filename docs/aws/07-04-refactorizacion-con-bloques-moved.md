# Refactorización con bloques `moved` en Terraform y LocalStack

Refactorizar una configuración permite mejorar sus nombres, separar responsabilidades y reorganizar módulos sin cambiar necesariamente la infraestructura que administra.

Terraform identifica los recursos mediante direcciones que forman parte de su relación con el estado.

Por eso, cambiar un nombre lógico, una clave de `for_each` o la ubicación de un recurso puede parecer una eliminación seguida de una creación.

Los bloques `moved` permiten declarar que una dirección anterior corresponde a una nueva dirección.

Esa declaración ayuda a conservar la asociación con el objeto existente mientras evoluciona la configuración.

En esta lección practicarás refactorizaciones progresivas sobre colas SQS creadas en LocalStack.

Revisarás planes, conservarás identificadores y comprobarás que los mensajes siguen disponibles después de reorganizar el código.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> No apliques una refactorización si el plan propone destrucciones que no puedes justificar.

---

## 1. Objetivos de aprendizaje

Esta lección desarrolla un procedimiento verificable para modificar direcciones sin perder identidad.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Explicar la finalidad de un bloque `moved`.
- Renombrar recursos sin recrearlos.
- Convertir una instancia simple en una instancia de `for_each`.
- Trasladar recursos a un módulo hijo.
- Renombrar módulos.
- Cambiar claves sin cambiar nombres remotos.
- Convertir instancias de `count` en claves estables.
- Mantener un historial de migraciones.
- Detectar modificaciones funcionales mezcladas con una refactorización.

### 1.2. Resultado práctico

Reorganizarás tres colas SQS y conservarás su identidad y un mensaje de prueba.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos de estado, módulos y direcciones.

### 2.1. Herramientas

Comprueba:

```bash
terraform version
docker version
docker compose version
aws --version
jq --version
```

Utilizaremos Terraform 1.6 o superior dentro de la serie 1.x.

Los bloques `moved` existen desde Terraform 1.1.

### 2.2. Base del curso

El proveedor AWS se limita a la serie 5.x.

Los comandos utilizan Bash y se ejecutan desde el host.

---

## 3. Compatibilidad del laboratorio

El docente debe validar la combinación concreta antes de distribuir la práctica.

### 3.1. Operaciones obligatorias

Comprueba creación, consulta, etiquetado y eliminación de colas SQS.

Verifica también envío y recepción de mensajes.

Terraform debe poder leer las colas y preparar los movimientos declarados.

### 3.2. Registro del entorno

Documenta:

- Versión de Terraform.
- Versión seleccionada del proveedor.
- Versión de Docker y AWS CLI.
- Imagen o digest de LocalStack.

### 3.3. Distinción

LocalStack emula SQS; Terraform interpreta los bloques `moved` y administra el estado.

---

## 4. Direcciones, nombres e identidad

Una dirección Terraform no es el nombre remoto del recurso.

### 4.1. Ejemplo inicial

```text
Dirección: aws_sqs_queue.work
Nombre:    curso-moved-work-alumno01
ID:        URL de la cola
```

### 4.2. Responsabilidades

La dirección permite identificar una instancia dentro de la configuración y el estado.

El ID del proveedor permite localizar el objeto del servicio.

El nombre remoto identifica la cola dentro de SQS.

### 4.3. Regla principal

**Cambiar una dirección no debería cambiar el objeto cuando solo estás reorganizando su gestión.**

---

## 5. Qué ocurre sin una migración

Terraform no puede adivinar cualquier intención de renombrado.

### 5.1. Cambio aparente

Si sustituyes `aws_sqs_queue.work` por `aws_sqs_queue.jobs`, desaparece una dirección y aparece otra.

### 5.2. Plan posible

Sin una migración, Terraform puede proponer:

```text
Destruir aws_sqs_queue.work
Crear aws_sqs_queue.jobs
```

### 5.3. Consecuencias

Un reemplazo puede eliminar mensajes o provocar conflictos con el nombre existente.

### 5.4. Precaución

No apliques ese plan para “ver qué pasa”; primero declara la relación entre ambas direcciones.

---

## 6. Sintaxis de `moved`

El bloque expresa una transición entre direcciones.

### 6.1. Ejemplo

```hcl
moved {
  from = aws_sqs_queue.work
  to   = aws_sqs_queue.jobs
}
```

### 6.2. Interpretación

`from` identifica la dirección histórica.

`to` identifica la dirección correspondiente en la nueva configuración.

### 6.3. Referencias

Las direcciones no se escriben como cadenas entre comillas.

### 6.4. Alcance

El bloque no contiene instrucciones para renombrar directamente el objeto en SQS.

---

## 7. Qué cambia durante la aplicación

Terraform utiliza la migración al interpretar las relaciones del estado.

### 7.1. Durante el plan

Reconoce que la nueva dirección corresponde a una instancia registrada anteriormente.

### 7.2. Durante la aplicación

Persiste la relación con la dirección nueva junto con los demás cambios aprobados.

### 7.3. Servicio remoto

Un movimiento puro no requiere crear ni destruir la cola.

El proveedor puede realizar consultas para actualizar observaciones.

### 7.4. Regla

Revisar el plan no sustituye su aplicación cuando necesitas persistir la migración.

---

## 8. Movimiento y modificación funcional

Un bloque `moved` no neutraliza cambios en los atributos.

### 8.1. Comparación

| **Cambio** | **Ejemplo** | **Efecto esperado** |
|------------|-------------|--------------------|
| Dirección | `work` → `jobs` | Migración de relación |
| Atributo mutable | Timeout 60 → 90 | Actualización del servicio |
| Atributo de reemplazo | Nombre de cola distinto | Posible reemplazo |
| Dirección y atributos | Renombrado y nueva configuración | Migración más acciones |

El plan debe explicar todas las acciones, no solamente el movimiento.

### 8.2. Procedimiento recomendado

Primero refactoriza sin cambios funcionales.

Después mejora los atributos mediante otro plan.

---

## 9. `moved` frente a `state mv`

Ambos procedimientos pueden reorganizar relaciones, pero tienen flujos distintos.

### 9.1. Comparación

| **Aspecto** | **Bloque `moved`** | **`terraform state mv`** |
|-------------|--------------------|-------------------------|
| Declaración | En configuración | En comando |
| Revisión | Mediante plan | Inspección y ejecución directa |
| Historial compartido | Puede conservarse en Git | Requiere documentación externa |
| Aplicación a otros estados | Reutilizable | Debe coordinarse por estado |

Los dos requieren comprobar origen, destino e identidad.

### 9.2. Laboratorio

Utilizaremos bloques `moved`, no comandos `state mv`.

### 9.3. Precaución

No ejecutes ambos procedimientos de forma concurrente sobre la misma relación.

---

## 10. Diseño de las sesiones

La práctica avanza mediante refactorizaciones pequeñas.

### 10.1. Secuencia principal

1. Crear una cola simple y dos colas con `count`.
2. Renombrar el recurso simple.
3. Introducir `for_each`.
4. Trasladar la cola a un módulo.
5. Renombrar el módulo.
6. Cambiar una clave dentro del módulo.
7. Convertir auditorías de `count` a `for_each`.
8. Trasladar auditorías al módulo.

### 10.2. Invariante

El número de colas seguirá siendo tres.

### 10.3. Datos

Un mensaje ficticio permitirá comprobar conservación del contenido.

---

## 11. Preparación del proyecto

Trabaja en un directorio independiente.

### 11.1. Estructura

```bash
mkdir -p terraform-moved-localstack/modules/queues
mkdir -p terraform-moved-localstack/planes
mkdir -p terraform-moved-localstack/resultados
mkdir -p terraform-moved-localstack/copias
cd terraform-moved-localstack
```

### 11.2. Aislamiento

No reutilices el estado de otra lección.

### 11.3. Ejecución

Los comandos se ejecutan desde esta raíz.

### 11.4. Organización

Los planes y copias quedarán fuera del material versionado.

---

## 12. Protección de archivos

El estado y los planes requieren protección aunque el laboratorio utilice datos ficticios.

### 12.1. `.gitignore`

```gitignore
.terraform/
*.tfstate
*.tfstate.*
*.tfplan
.env
planes/
resultados/
copias/
crash.log
```

### 12.2. Qué conservar

Versiona configuración, módulos y `.terraform.lock.hcl`.

### 12.3. Precaución

Un archivo ignorado puede seguir en Git si ya se había registrado anteriormente.

---

## 13. Imagen y Docker Compose

Utiliza una imagen validada por el docente.

### 13.1. Selección

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 13.2. `compose.yaml`

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

### 13.3. Alcance

No necesitamos montar el socket Docker dentro de LocalStack.

---

## 14. Credenciales y conectividad

Prepara la terminal antes de utilizar AWS CLI.

### 14.1. Configuración

```bash
docker compose up -d

export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_PAGER=""
unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE

aws_local() {
  aws --endpoint-url=http://localhost:4566 --region us-east-1 "$@"
}
```

### 14.2. Comprobación

Ejecuta `aws_local sqs list-queues` y espera una respuesta válida.

---

## 15. Requisitos y proveedor Terraform

Crea `versions.tf` y `providers.tf`.

### 15.1. Requisitos

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

### 15.2. Proveedor local

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

## 16. Variables e identidad

Crea `variables.tf` y `terraform.tfvars`.

### 16.1. Declaración

```hcl
variable "suffix" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.suffix))
    error_message = "Usa entre 4 y 8 caracteres alfanuméricos."
  }
}
```

### 16.2. Entrada

```hcl
suffix = "alumno01"
```

### 16.3. Entorno compartido

Cada alumno necesita un sufijo diferente si utiliza el mismo LocalStack.

---

## 17. Configuración inicial

Crea `main.tf` con una cola simple y dos colas de auditoría.

### 17.1. Recursos

```hcl
resource "aws_sqs_queue" "work" {
  name                       = "curso-moved-work-${var.suffix}"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 86400

  tags = {
    Laboratory = "LocalStack"
    Role       = "work"
  }
}

resource "aws_sqs_queue" "audit" {
  count = 2

  name                       = "curso-moved-audit-${count.index}-${var.suffix}"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 86400

  tags = {
    Laboratory = "LocalStack"
    Role       = "audit"
  }
}
```

### 17.2. Direcciones iniciales

Habrá `aws_sqs_queue.work`, `aws_sqs_queue.audit[0]` y `aws_sqs_queue.audit[1]`.

---

## 18. Outputs iniciales

Crea `outputs.tf` para conservar identificadores de forma sencilla.

### 18.1. Configuración

```hcl
output "work_url" {
  value = aws_sqs_queue.work.id
}

output "audit_urls" {
  value = {
    first  = aws_sqs_queue.audit[0].id
    second = aws_sqs_queue.audit[1].id
  }
}
```

### 18.2. Contrato estable

Mantendremos los nombres de estos outputs durante las refactorizaciones.

### 18.3. Utilidad

Sus expresiones cambiarán, pero los consumidores podrán seguir consultando las mismas claves.

---

## 19. Sesión 1: desplegar la base

Duración orientativa: 20 minutos.

### 19.1. Secuencia

```bash
terraform init
terraform fmt -recursive
terraform validate
terraform workspace show
terraform plan -out=planes/01-create.tfplan
terraform show planes/01-create.tfplan
terraform apply planes/01-create.tfplan
terraform state list
```

### 19.2. Resultado esperado

El plan inicial debe crear tres recursos.

### 19.3. Condición

El workspace debe ser `default` y los endpoints deben seguir siendo locales.

---

## 20. Guardar el inventario original

La conservación de identidad debe comprobarse con evidencia previa.

### 20.1. Identificadores y copia

```bash
WORK_URL="$(terraform output -raw work_url)"
AUDIT_0="$(terraform output -json audit_urls | jq -er '.first')"
AUDIT_1="$(terraform output -json audit_urls | jq -er '.second')"

terraform output -json > resultados/outputs-initial.json
terraform state list > resultados/addresses-initial.txt

umask 077
terraform state pull > copias/state-initial.tfstate
```

### 20.2. Evidencia adicional

Consulta los ARN y los atributos de las tres colas mediante AWS CLI.

### 20.3. Precaución

Los outputs originales se conservarán como referencia; no los sobrescribas después.

---

## 21. Enviar un mensaje de prueba

El mensaje permitirá verificar que la cola no fue reemplazada.

### 21.1. Envío

```bash
aws_local sqs send-message \
  --queue-url "$WORK_URL" \
  --message-body '{"exercise":"moved","marker":"TRAINING-001"}' \
  > resultados/message-sent.json

MESSAGE_ID="$(jq -er '.MessageId' resultados/message-sent.json)"
```

### 21.2. Condición

No hay consumidores automáticos en este laboratorio.

### 21.3. Retención

Completa las sesiones dentro del periodo de retención de un día.

### 21.4. Precaución

Recrear LocalStack puede perder el mensaje aunque Terraform conserve su estado.

---

## 22. Sesión 2: observar el problema sin `moved`

Esta sesión prepara un plan inseguro, pero no lo aplica.

### 22.1. Cambio provisional

En `main.tf`, cambia el nombre lógico `work` por `jobs`.

En `outputs.tf`, cambia `aws_sqs_queue.work.id` por `aws_sqs_queue.jobs.id`.

### 22.2. Observación

```bash
terraform plan -out=planes/02-without-moved.tfplan
terraform show planes/02-without-moved.tfplan
```

### 22.3. Resultado probable

El plan propondrá crear la nueva dirección y destruir la antigua.

### 22.4. Prohibición práctica

**No apliques este plan; es una evidencia del problema que vamos a corregir.**

---

## 23. Declarar el primer movimiento

Crea `migrations.tf` para documentar el renombrado.

### 23.1. Bloque

```hcl
moved {
  from = aws_sqs_queue.work
  to   = aws_sqs_queue.jobs
}
```

### 23.2. Plan revisado

```bash
terraform plan -out=planes/03-rename.tfplan
terraform show planes/03-rename.tfplan
terraform apply planes/03-rename.tfplan
```

### 23.3. Resultado esperado

Debe reconocer el movimiento sin creación, actualización funcional ni destrucción de la cola.

### 23.4. Limpieza preventiva

Elimina el plan inseguro con `rm planes/02-without-moved.tfplan`.

---

## 24. Comprobar el renombrado

La nueva dirección debe conservar el ID original.

### 24.1. Verificación

```bash
terraform state show aws_sqs_queue.jobs
terraform state list -id="$WORK_URL"

test "$(terraform output -raw work_url)" = "$WORK_URL"

aws_local sqs get-queue-attributes \
  --queue-url "$WORK_URL" \
  --attribute-names QueueArn VisibilityTimeout
```

### 24.2. Resultado

La dirección cambia de `work` a `jobs`.

La URL, el nombre remoto y la cola existente permanecen.

### 24.3. Regla

Conserva el bloque histórico; no lo borres después de la primera aplicación.

---

## 25. Sesión 3: introducir `for_each`

Convertiremos la instancia simple en una instancia identificada por una clave.

### 25.1. Sustituir únicamente el bloque `jobs`

```hcl
resource "aws_sqs_queue" "jobs" {
  for_each = toset(["main"])

  name                       = "curso-moved-work-${var.suffix}"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 86400

  tags = {
    Laboratory = "LocalStack"
    Role       = "work"
  }
}
```

### 25.2. Output actualizado

La expresión de `work_url` pasa a ser `aws_sqs_queue.jobs["main"].id`.

### 25.3. Identidad

El nombre remoto no cambia.

---

## 26. Migrar la instancia simple

Añade otro bloque al archivo `migrations.tf`.

### 26.1. Nueva transición

```hcl
moved {
  from = aws_sqs_queue.jobs
  to   = aws_sqs_queue.jobs["main"]
}
```

### 26.2. Secuencia

```bash
terraform plan -out=planes/04-for-each.tfplan
terraform show planes/04-for-each.tfplan
terraform apply planes/04-for-each.tfplan
terraform state list
```

### 26.3. Cadena conservada

El historial queda como `work` → `jobs` → `jobs["main"]`.

### 26.4. Resultado esperado

La instancia `["main"]` conserva la URL original.

---

## 27. Sesión 4: preparar un módulo hijo

Ahora separaremos la responsabilidad de las colas dentro de un módulo local.

### 27.1. `modules/queues/main.tf`

```hcl
terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

variable "suffix" {
  type = string
}

resource "aws_sqs_queue" "work" {
  for_each = toset(["main"])

  name                       = "curso-moved-work-${var.suffix}"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 86400

  tags = {
    Laboratory = "LocalStack"
    Role       = "work"
  }
}
```

### 27.2. Proveedor

El módulo heredará la configuración AWS predeterminada del módulo raíz.

---

## 28. Trasladar la configuración al módulo

El recurso ya no debe estar declarado simultáneamente en dos ubicaciones.

### 28.1. Output del módulo

Crea `modules/queues/outputs.tf`:

```hcl
output "work_url" {
  value = aws_sqs_queue.work["main"].id
}
```

### 28.2. Llamada desde la raíz

Elimina el bloque raíz `aws_sqs_queue.jobs` y añade:

```hcl
module "queues" {
  source = "./modules/queues"
  suffix = var.suffix
}
```

### 28.3. Output raíz

Cambia la expresión de `work_url` a `module.queues.work_url`.

---

## 29. Declarar el traslado al módulo

Añade la transición al archivo raíz `migrations.tf`.

### 29.1. Bloque

```hcl
moved {
  from = aws_sqs_queue.jobs["main"]
  to   = module.queues.aws_sqs_queue.work["main"]
}
```

### 29.2. Inicialización y aplicación

```bash
terraform init
terraform validate
terraform plan -out=planes/05-to-module.tfplan
terraform show planes/05-to-module.tfplan
terraform apply planes/05-to-module.tfplan
```

### 29.3. Resultado esperado

La cola cambia de ubicación lógica sin recreación.

### 29.4. Alcance

Este movimiento pertenece a la raíz porque relaciona una dirección raíz con un módulo hijo.

---

## 30. Sesión 5: renombrar el módulo

Cambiar el nombre de una llamada al módulo cambia el prefijo de sus recursos.

### 30.1. Configuración

Renombra `module "queues"` a `module "messaging"` en `main.tf`.

Actualiza la expresión del output raíz a `module.messaging.work_url`.

### 30.2. Migración raíz

```hcl
moved {
  from = module.queues
  to   = module.messaging
}
```

### 30.3. Aplicación

Revisa y aplica un plan nuevo llamado `planes/06-module-rename.tfplan`.

### 30.4. Resultado

La dirección debe comenzar ahora con `module.messaging`.

---

## 31. Sesión 6: cambiar una clave dentro del módulo

La nueva clave lógica será `primary`, pero el objeto remoto seguirá siendo el mismo.

### 31.1. Recurso actualizado del módulo

Sustituye el bloque `work` de `modules/queues/main.tf`:

```hcl
resource "aws_sqs_queue" "work" {
  for_each = {
    primary = "work"
  }

  name                       = "curso-moved-${each.value}-${var.suffix}"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 86400

  tags = {
    Laboratory = "LocalStack"
    Role       = "work"
  }
}
```

### 31.2. Separación

La clave identifica la instancia; el valor conserva la parte histórica del nombre remoto.

---

## 32. Movimiento relativo dentro del módulo

El módulo puede declarar sus propias migraciones internas.

### 32.1. `modules/queues/migrations.tf`

```hcl
moved {
  from = aws_sqs_queue.work["main"]
  to   = aws_sqs_queue.work["primary"]
}
```

### 32.2. Output del módulo

Cambia su expresión a `aws_sqs_queue.work["primary"].id`.

### 32.3. Aplicación

Revisa y aplica `planes/07-module-key.tfplan`.

### 32.4. Alcance

Las direcciones del bloque son relativas al módulo que lo contiene.

### 32.5. Resultado

La dirección final de trabajo termina en `work["primary"]`.

---

## 33. Sesión 7: convertir `count` en `for_each`

Las auditorías pasarán de índices numéricos a claves explícitas.

### 33.1. Sustituir el bloque raíz `audit`

```hcl
resource "aws_sqs_queue" "audit" {
  for_each = {
    first  = 0
    second = 1
  }

  name                       = "curso-moved-audit-${each.value}-${var.suffix}"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 86400

  tags = {
    Laboratory = "LocalStack"
    Role       = "audit"
  }
}
```

### 33.2. Correspondencia

`first` conserva la cola cuyo nombre contiene `audit-0`.

`second` conserva la cola cuyo nombre contiene `audit-1`.

---

## 34. Declarar movimientos de auditoría

La migración debe expresar qué índice corresponde a cada clave.

### 34.1. Añadir a `migrations.tf`

```hcl
moved {
  from = aws_sqs_queue.audit[0]
  to   = aws_sqs_queue.audit["first"]
}

moved {
  from = aws_sqs_queue.audit[1]
  to   = aws_sqs_queue.audit["second"]
}
```

### 34.2. Outputs

Actualiza `audit_urls` para usar `["first"]` y `["second"]`.

### 34.3. Aplicación

Revisa y aplica `planes/08-audit-for-each.tfplan`.

### 34.4. Verificación

Las URLs deben seguir coincidiendo con `AUDIT_0` y `AUDIT_1`.

---

## 35. Sesión 8: trasladar auditorías al módulo

Centralizaremos la declaración de las tres colas.

### 35.1. Configuración del módulo

Copia el bloque `aws_sqs_queue.audit` de la sección 33 al final de `modules/queues/main.tf`.

Después elimina ese mismo bloque del `main.tf` raíz.

### 35.2. Output del módulo

Añade a `modules/queues/outputs.tf`:

```hcl
output "audit_urls" {
  value = {
    for key, queue in aws_sqs_queue.audit : key => queue.id
  }
}
```

### 35.3. Output raíz

La expresión de `audit_urls` pasa a ser `module.messaging.audit_urls`.

---

## 36. Migrar el recurso completo de auditoría

Un movimiento de recurso puede conservar sus instancias indexadas.

### 36.1. Bloque raíz

```hcl
moved {
  from = aws_sqs_queue.audit
  to   = module.messaging.aws_sqs_queue.audit
}
```

### 36.2. Secuencia

```bash
terraform plan -out=planes/09-audit-to-module.tfplan
terraform show planes/09-audit-to-module.tfplan
terraform apply planes/09-audit-to-module.tfplan
terraform state list
```

### 36.3. Resultado esperado

Las dos claves pasan al módulo sin cambiar las colas.

### 36.4. Verificación

No debe aparecer creación, actualización funcional ni destrucción por este traslado.

---

## 37. Configuración final del módulo raíz

Al finalizar, la raíz conserva composición, proveedor e historial.

### 37.1. `main.tf` final

```hcl
module "messaging" {
  source = "./modules/queues"
  suffix = var.suffix
}
```

### 37.2. `outputs.tf` final

```hcl
output "work_url" {
  value = module.messaging.work_url
}

output "audit_urls" {
  value = module.messaging.audit_urls
}
```

### 37.3. Otros archivos

Conserva `versions.tf`, `providers.tf`, variables, entradas y todos los movimientos raíz.

---

## 38. Historial y alcance de las migraciones

Las transiciones anteriores deben permanecer disponibles para estados que todavía usan direcciones históricas.

### 38.1. Cadena de trabajo

El historial comprende renombrado raíz, introducción de clave, traslado a módulo y renombrado del módulo.

La migración interna del módulo cambia después `main` a `primary`.

### 38.2. Cadena de auditoría

Los índices se convierten en claves y el recurso se traslada al módulo.

### 38.3. No reescribir el pasado

No sustituyas indiscriminadamente todas las direcciones antiguas por las actuales.

### 38.4. Regla

Conserva origen y destino históricos cuando necesitas permitir actualizaciones desde versiones anteriores.

---

## 39. Sesión 9: verificar el inventario final

Las direcciones cambian; el número de objetos permanece.

### 39.1. Direcciones esperadas

```text
module.messaging.aws_sqs_queue.audit["first"]
module.messaging.aws_sqs_queue.audit["second"]
module.messaging.aws_sqs_queue.work["primary"]
```

### 39.2. Comparación de outputs

```bash
terraform output -json > resultados/outputs-final.json

jq -S 'map_values(.value)' resultados/outputs-initial.json \
  > resultados/values-initial.json

jq -S 'map_values(.value)' resultados/outputs-final.json \
  > resultados/values-final.json

diff -u resultados/values-initial.json resultados/values-final.json
```

### 39.3. Resultado

No deberían existir diferencias en las URLs expuestas.

---

## 40. Verificar conservación del mensaje

La comprobación de datos complementa la conservación de identificadores.

### 40.1. Recepción

```bash
aws_local sqs receive-message \
  --queue-url "$WORK_URL" \
  --max-number-of-messages 1 \
  --wait-time-seconds 5 \
  --visibility-timeout 30 \
  > resultados/message-after-refactor.json
```

### 40.2. Validación

Comprueba que `MessageId` coincide con `MESSAGE_ID`.

El cuerpo debe contener el marcador `TRAINING-001`.

### 40.3. Precaución

Recibir vuelve invisible el mensaje durante el periodo indicado.

### 40.4. Límite

Esta prueba verifica el mensaje del laboratorio, no certifica conservación universal de datos.

---

## 41. Inspección JSON del plan

El plan puede analizarse para identificar movimientos y acciones remotas.

### 41.1. Exportación

```bash
terraform show -json planes/09-audit-to-module.tfplan \
  > resultados/audit-move-plan.json

jq '
  .resource_changes[]? |
  select(.mode == "managed") |
  {
    address,
    previous_address,
    actions: .change.actions
  }
' resultados/audit-move-plan.json
```

### 41.2. Movimiento puro

Las entradas afectadas pueden mostrar `previous_address` y acciones `["no-op"]`.

### 41.3. Precaución

El JSON del plan puede contener valores sensibles en otros proyectos.

---

## 42. Sesión 10: separar una mejora funcional

Una vez estabilizadas las direcciones, puedes modificar atributos mediante otro plan.

### 42.1. Cambio intencionado

En el recurso `work` del módulo, cambia la visibilidad de 60 a 90 segundos.

### 42.2. Revisión

```bash
terraform plan -out=planes/10-update-timeout.tfplan
terraform show planes/10-update-timeout.tfplan
```

### 42.3. Resultado esperado

Debe proponer una actualización del atributo, no un reemplazo de la cola.

### 42.4. Aplicación opcional del ejercicio

Aplica el plan si esa mejora forma parte de la sesión.

### 42.5. Evidencia

Consulta SQS y confirma que la URL original permanece.

---

## 43. Sesión 11: comprobar idempotencia

Una migración aplicada no debe repetirse como una recreación en cada ejecución.

### 43.1. Comprobación

```bash
terraform plan
terraform state list
terraform providers
```

### 43.2. Resultado esperado

Con la configuración estable, el plan no debe requerir cambios.

### 43.3. Origen ausente

Cuando ya no existe una instancia en la dirección histórica, su bloque `moved` no vuelve a mover ese objeto.

### 43.4. Configuración nueva

Un entorno creado desde cero utiliza directamente las direcciones actuales.

### 43.5. Regla

Conservar migraciones no obliga a crear recursos en sus ubicaciones históricas.

---

## 44. Límites y errores frecuentes

Los movimientos deben representar correspondencias válidas y no ambiguas.

### 44.1. Casos problemáticos

Revisa:

- Destino ya ocupado.
- Origen escrito incorrectamente.
- Clave confundida con índice numérico.
- Ciclos entre movimientos.
- Varios orígenes dirigidos al mismo destino.
- Recurso antiguo todavía declarado como objeto independiente.
- Cambio involuntario del nombre remoto.

### 44.2. Tipos distintos

La migración entre tipos de recurso requiere soporte específico y no forma parte de esta práctica.

### 44.3. Regla

`moved` no es una herramienta para convertir arbitrariamente una cola en otro servicio.

---

## 45. Expresividad y versiones de módulos

Los bloques `moved` describen direcciones concretas, no algoritmos de migración.

### 45.1. Limitaciones

No admiten `count`, `for_each` ni bloques `dynamic` para generar movimientos dentro del propio bloque.

### 45.2. Muchas instancias

Puedes necesitar movimientos explícitos cuando cada instancia cambia a una clave diferente.

### 45.3. Módulos publicados

Conservar migraciones permite que consumidores actualicen desde versiones anteriores.

### 45.4. Retirada

Eliminar bloques históricos puede romper rutas de actualización de estados atrasados.

### 45.5. Regla

Documenta qué versiones de origen siguen siendo compatibles antes de retirar migraciones.

---

## 46. Equipos, estados atrasados y concurrencia

Una refactorización debe coordinarse con todos los estados que consumen la configuración.

### 46.1. Estados atrasados

Comprueba que las cadenas conservadas permiten recorrer versiones intermedias omitidas.

### 46.2. Prueba aislada

Ensaya esa actualización en un laboratorio separado con backend y LocalStack independientes.

### 46.3. No duplicar gestión

No conectes dos copias del estado al mismo conjunto de colas para probar una migración.

### 46.4. Bloqueo

El bloqueo de un backend no coordina automáticamente estados independientes.

### 46.5. Regla

Detén escritores concurrentes y revisa workspace, backend y directorio antes de aplicar.

---

## 47. Copias y recuperación

Una copia previa permite investigar una migración incorrecta, pero no justifica restauraciones automáticas.

### 47.1. Procedimiento ante un problema

Detén nuevas aplicaciones y conserva el estado actual.

Compara configuración, direcciones e identificadores remotos.

Determina si se modificó únicamente la relación o también la infraestructura.

### 47.2. Precaución

Restaurar una copia antigua puede perder relaciones o cambios posteriores.

### 47.3. Herramientas avanzadas

No utilices `state push -force` para ignorar discrepancias sin investigar lineage y serial.

### 47.4. Regla

Si hubo destrucción de datos, restaurar el estado no recupera esos datos.

---

## 48. Limpieza del laboratorio

Mantén LocalStack disponible mientras Terraform destruye los recursos.

### 48.1. Secuencia revisada

```bash
terraform plan -destroy -out=planes/destroy.tfplan
terraform show planes/destroy.tfplan
terraform apply planes/destroy.tfplan
terraform state list
aws_local sqs list-queues
docker compose down
```

### 48.2. Resultado esperado

Terraform debe destruir tres colas usando sus direcciones finales.

### 48.3. Datos

La destrucción elimina los mensajes que todavía existan.

### 48.4. Precaución

Borrar el estado o los bloques `moved` no sustituye este procedimiento.

---

## 49. Diferencias respecto a AWS real

La emulación permite practicar migraciones, no certificar operaciones de producción.

### 49.1. Aspectos adicionales

En AWS real revisa permisos, propagación, cuotas, costes y dependencias externas.

### 49.2. Aplicaciones consumidoras

Conservar una cola no garantiza que todas las aplicaciones utilicen correctamente outputs o referencias modificadas.

### 49.3. Persistencia local

Eliminar LocalStack puede hacer desaparecer recursos mientras Terraform conserva sus asociaciones.

### 49.4. Seguridad

Protege backend, historial, planes y copias con controles apropiados.

### 49.5. Límite

El estado y los movimientos no constituyen backups de mensajes ni de aplicaciones.

---

## 50. Ejercicios, evaluación y resumen

La práctica se completa cuando puedes demostrar qué cambió y qué permaneció igual.

### 50.1. Ejercicios

1. Explica el plan generado sin `moved`.
2. Renombra un recurso conservando su ID.
3. Introduce una clave de `for_each`.
4. Traslada recursos y renombra el módulo.
5. Convierte índices de auditoría en claves explícitas.
6. Comprueba URLs y conservación del mensaje.
7. Documenta una ruta de actualización desde una versión anterior.
8. Destruye y verifica todos los recursos.

### 50.2. Criterio de evaluación

Entrega inventarios inicial y final, planes revisados, historial de movimientos y evidencia de identidad conservada.

### 50.3. Idea final

**Una refactorización segura cambia la organización de Terraform sin confundirla con un cambio de infraestructura: declara las migraciones, conserva el historial y verifica el resultado antes de continuar.**