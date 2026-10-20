# Inspección del estado y comandos `state` con Terraform y LocalStack

El estado conserva las relaciones entre las direcciones de Terraform y los objetos que administra el proveedor.

Inspeccionarlo permite comprobar qué recursos están registrados, qué identificadores utiliza Terraform y qué atributos conserva.

Los comandos `terraform state` también permiten modificar determinadas relaciones sin ejecutar directamente una operación de creación o eliminación en el servicio.

Esa capacidad resulta útil para reorganizar configuraciones, recuperar asociaciones y corregir situaciones excepcionales.

También exige precaución: retirar una relación no elimina el recurso, y mover una dirección no actualiza automáticamente los archivos de configuración.

En esta lección construirás un laboratorio con colas SQS distribuidas entre el módulo raíz y un módulo hijo.

Practicarás inspección, filtros, direcciones indexadas, movimientos, desvinculación, importación y verificación posterior.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Ejecuta las operaciones únicamente sobre el directorio y los recursos de este laboratorio.

---

## 1. Objetivos de aprendizaje

Esta lección desarrolla un procedimiento práctico para inspeccionar y administrar relaciones de estado.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Enumerar recursos administrados.
- Interpretar direcciones con módulos e índices.
- Consultar atributos registrados.
- Exportar representaciones de lectura.
- Crear copias controladas del estado.
- Mover direcciones sin recrear objetos.
- Desvincular y recuperar una asociación.
- Revisar planes posteriores a operaciones de estado.

### 1.2. Resultado práctico

Administrarás cinco colas SQS y comprobarás su identidad antes y después de cada operación.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos de los fundamentos del estado.

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

Utilizaremos Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se limita a la serie 5.x como base didáctica.

### 2.2. Conocimientos recomendados

Debes reconocer recursos, outputs, módulos, `for_each`, `count` y planes guardados.

Los comandos utilizan Bash y se ejecutan desde el host.

---

## 3. Compatibilidad del laboratorio

El docente debe validar la combinación concreta antes de distribuir la práctica.

### 3.1. Operaciones obligatorias

Comprueba:

- Creación de colas SQS.
- Consulta de atributos y etiquetas.
- Lectura de recursos por el proveedor.
- Importación de una cola mediante su URL.
- Actualización de configuración.
- Eliminación de colas.
- Persistencia de las relaciones en el backend local.

### 3.2. Registro del entorno

Documenta Terraform, proveedor AWS, Docker, AWS CLI e imagen o digest de LocalStack.

### 3.3. Distinción

LocalStack emula SQS; los comandos de estado pertenecen a Terraform.

---

## 4. Configuración, estado y servicio

Una inspección correcta distingue tres representaciones relacionadas.

### 4.1. Comparación

| **Representación** | **Contenido principal** | **Dónde se consulta** |
|--------------------|-------------------------|-----------------------|
| Configuración | Intención declarada | Archivos `.tf` |
| Estado | Relaciones y atributos registrados | Backend de Terraform |
| Servicio | Objetos existentes y sus propiedades | API de SQS |

En este laboratorio, el servicio administrado existe dentro de LocalStack.

### 4.2. Regla principal

**Consultar el estado no equivale a consultar el servicio.**

### 4.3. Consecuencia

Las verificaciones importantes combinarán comandos de Terraform y AWS CLI.

---

## 5. Comandos de inspección y modificación

No todos los comandos `state` tienen el mismo impacto.

### 5.1. Comparación

| **Comando** | **Propósito** | **Modifica relaciones de estado** |
|-------------|---------------|----------------------------------|
| `state list` | Enumerar direcciones | No |
| `state show` | Mostrar una instancia | No |
| `state pull` | Exportar el estado | No |
| `state mv` | Mover una dirección | Sí |
| `state rm` | Retirar una relación | Sí |

La lectura de atributos registrados no confirma que el objeto remoto siga existiendo.

### 5.2. Otros comandos

`state push` y `state replace-provider` requieren una revisión más especializada.

### 5.3. Procedimiento

Primero inspecciona, después prepara una copia y finalmente modifica solo si existe una necesidad clara.

---

## 6. Direcciones del módulo raíz

Una dirección identifica una instancia administrada por Terraform.

### 6.1. Recurso sin índice

```text
aws_sqs_queue.single
```

### 6.2. Partes de la dirección

- `aws_sqs_queue`: tipo de recurso.
- `single`: nombre lógico del bloque.

### 6.3. Distinción

El nombre lógico no es necesariamente el nombre de la cola.

### 6.4. Alcance

Cambiar la dirección puede ser una refactorización aunque el objeto remoto permanezca igual.

---

## 7. Direcciones con `for_each`

`for_each` identifica instancias mediante claves estables.

### 7.1. Ejemplos

```text
aws_sqs_queue.primary["blue"]
aws_sqs_queue.primary["green"]
```

### 7.2. Identidad lógica

Las claves `blue` y `green` forman parte de las direcciones.

### 7.3. Precaución

Cambiar una clave puede parecer una eliminación y una creación si no declaras una migración.

### 7.4. Shell

Las comillas internas deben llegar correctamente a Terraform.

### 7.5. Recomendación

En Bash, rodea la dirección completa con comillas simples.

---

## 8. Direcciones con `count`

`count` identifica instancias mediante índices numéricos.

### 8.1. Ejemplo

```text
aws_sqs_queue.audit[0]
```

### 8.2. Diferencia

`[0]` no equivale a `["0"]`.

El primero es un índice de `count`; el segundo es una clave de `for_each`.

### 8.3. Riesgo

Reordenar listas utilizadas con `count` puede cambiar qué objeto corresponde a cada índice.

### 8.4. Regla

Antes de mover una instancia, comprueba qué identificador remoto tiene registrado.

---

## 9. Direcciones dentro de módulos

Un módulo añade un prefijo a las direcciones de sus recursos.

### 9.1. Ejemplo

```text
module.messaging.aws_sqs_queue.queue["events"]
```

### 9.2. Interpretación

- `module.messaging`: instancia del módulo.
- `aws_sqs_queue.queue`: recurso del módulo.
- `["events"]`: instancia identificada por `for_each`.

### 9.3. Alcance

Mover un módulo puede cambiar las direcciones de todos sus recursos descendientes.

### 9.4. Precaución

No confíes únicamente en el nombre del módulo para identificar los objetos que contiene.

---

## 10. Direcciones e identificadores remotos

Terraform y SQS utilizan identificadores distintos.

### 10.1. Comparación

| **Identificador** | **Ejemplo conceptual** | **Responsabilidad** |
|-------------------|-------------------------|--------------------|
| Dirección | `aws_sqs_queue.audit[0]` | Instancia Terraform |
| ID del proveedor | URL de cola | Localizar el objeto |
| Nombre | `curso-state-audit-alumno01` | Identidad visible en SQS |
| ARN | ARN de cola | Referencias y autorización |

En `aws_sqs_queue`, la URL se utiliza como identificador de importación.

### 10.2. Regla

No sustituyas automáticamente un ID por un ARN.

### 10.3. Verificación

Consulta la documentación del recurso cuando cambies de tipo de infraestructura.

---

## 11. Diseño de la práctica

Construiremos recursos con varias formas de dirección.

### 11.1. Inventario previsto

| **Ubicación** | **Construcción** | **Instancias** |
|---------------|------------------|----------------|
| Módulo raíz | `for_each` | `blue`, `green` |
| Módulo raíz | `count` | Auditoría `[0]` |
| Módulo hijo | `for_each` | `events`, `notifications` |

El total inicial será de cinco colas.

### 11.2. Sin aplicación

No enviaremos mensajes ni conectaremos consumidores.

### 11.3. Motivo

Así podremos centrarnos en relaciones de estado sin mezclar recuperación de datos.

---

## 12. Preparación del directorio

Trabaja en una carpeta independiente.

### 12.1. Estructura

```bash
mkdir -p terraform-state-inspection/modules/queues
mkdir -p terraform-state-inspection/planes
mkdir -p terraform-state-inspection/resultados
mkdir -p terraform-state-inspection/copias
cd terraform-state-inspection
```

### 12.2. Aislamiento

No copies el estado de otra práctica.

### 12.3. Directorio de trabajo

Todos los comandos siguientes se ejecutan desde la raíz de este proyecto.

### 12.4. Datos

Utilizaremos únicamente nombres y etiquetas ficticias.

---

## 13. Protección de archivos

Separa configuración versionable y artefactos operativos.

### 13.1. `.gitignore`

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

### 13.2. Qué conservar

Versiona los archivos `.tf`, entradas ficticias y `.terraform.lock.hcl`.

### 13.3. Precaución

Un archivo ignorado puede seguir registrado en Git si ya se había añadido anteriormente.

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

## 15. Arranque y credenciales ficticias

Prepara la terminal antes de utilizar AWS CLI.

### 15.1. Configuración

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

### 15.2. Comprobación

Ejecuta `aws_local sqs list-queues` y espera una respuesta válida.

### 15.3. Diagnóstico

Si falla, revisa `docker compose ps` y los logs de LocalStack.

---

## 16. Requisitos y proveedor Terraform

Crea `versions.tf` y `providers.tf`.

### 16.1. Requisitos

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

### 16.2. Proveedor

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

## 17. Variables y recursos del módulo raíz

Crea `variables.tf`, `terraform.tfvars` y `main.tf`.

### 17.1. Entrada

```hcl
# variables.tf
variable "suffix" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.suffix))
    error_message = "Usa entre 4 y 8 caracteres alfanuméricos."
  }
}
```

```hcl
# terraform.tfvars
suffix = "alumno01"
```

### 17.2. Recursos

```hcl
# main.tf
resource "aws_sqs_queue" "primary" {
  for_each = toset(["blue", "green"])

  name                       = "curso-state-${each.key}-${var.suffix}"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 86400
  tags = {
    Laboratory = "LocalStack"
    Group      = "primary"
  }
}

resource "aws_sqs_queue" "audit" {
  count = 1

  name                       = "curso-state-audit-${var.suffix}"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 86400
}
```

---

## 18. Módulo hijo de colas

Crea `modules/queues/main.tf`.

### 18.1. Configuración

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

resource "aws_sqs_queue" "queue" {
  for_each = toset(["events", "notifications"])

  name                       = "curso-state-${each.key}-${var.suffix}"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 86400
  tags = {
    Laboratory = "LocalStack"
    Group      = "module"
  }
}

output "urls" {
  value = {
    for key, queue in aws_sqs_queue.queue : key => queue.id
  }
}
```

---

## 19. Llamada al módulo y outputs

Completa el módulo raíz con la llamada y sus resultados.

### 19.1. Añadir a `main.tf`

```hcl
module "messaging" {
  source = "./modules/queues"
  suffix = var.suffix
}
```

### 19.2. `outputs.tf`

```hcl
output "primary_urls" {
  value = {
    for key, queue in aws_sqs_queue.primary : key => queue.id
  }
}

output "audit_url" {
  value = aws_sqs_queue.audit[0].id
}

output "module_urls" {
  value = module.messaging.urls
}
```

### 19.3. Proveedor heredado

El módulo utiliza la configuración AWS predeterminada del módulo raíz.

---

## 20. Sesión 1: desplegar e inventariar

Duración orientativa: 25 minutos.

### 20.1. Secuencia

```bash
terraform init
terraform fmt -recursive
terraform validate
terraform workspace show
terraform plan -out=planes/create.tfplan
terraform show planes/create.tfplan
terraform apply planes/create.tfplan
terraform state list
```

### 20.2. Condiciones

El workspace debe ser `default`.

El plan inicial debe crear cinco recursos.

### 20.3. Evidencia

Guarda el listado con `terraform state list > resultados/addresses-initial.txt`.

### 20.4. Verificación

Consulta SQS para confirmar que existen las cinco colas del laboratorio.

---

## 21. Sesión 2: filtrar con `state list`

Puedes limitar el inventario mediante direcciones.

### 21.1. Comandos

```bash
terraform state list aws_sqs_queue.primary

terraform state list 'aws_sqs_queue.primary["blue"]'

terraform state list 'aws_sqs_queue.audit[0]'

terraform state list module.messaging
```

### 21.2. Resultados

El primer comando debe mostrar dos instancias.

Los comandos con instancia exacta deben mostrar una dirección.

El módulo debe mostrar sus dos recursos.

### 21.3. Precaución

No interpretes los argumentos como patrones glob del shell.

---

## 22. Sesión 3: buscar por identificador

`state list` también permite buscar recursos por su ID registrado.

### 22.1. Obtener una URL

```bash
BLUE="$(terraform output -json primary_urls | jq -er '.blue')"
GREEN="$(terraform output -json primary_urls | jq -er '.green')"
AUDIT="$(terraform output -raw audit_url)"
```

### 22.2. Buscar la relación

```bash
terraform state list -id="$BLUE"
```

### 22.3. Resultado esperado

Debe aparecer `aws_sqs_queue.primary["blue"]`.

### 22.4. Límite

La búsqueda utiliza el ID conservado en el estado; no descubre automáticamente recursos externos.

---

## 23. Sesión 4: consultar instancias exactas

`state show` presenta los atributos de una instancia registrada.

### 23.1. Comandos

```bash
terraform state show 'aws_sqs_queue.primary["blue"]' \
  > resultados/blue-state.txt

terraform state show 'aws_sqs_queue.audit[0]' \
  > resultados/audit-state.txt

terraform state show \
  'module.messaging.aws_sqs_queue.queue["events"]' \
  > resultados/events-state.txt
```

### 23.2. Qué identificar

Busca `id`, `arn`, `name` y `visibility_timeout_seconds`.

### 23.3. Precaución

Para un recurso con varias instancias, especifica la instancia que quieres inspeccionar.

### 23.4. Distinción

La salida no es un archivo `.tf` listo para copiar sin revisión.

---

## 24. Sesión 5: contrastar con SQS

La API del servicio proporciona una fuente independiente.

### 24.1. Consultas

```bash
aws_local sqs get-queue-attributes \
  --queue-url "$BLUE" \
  --attribute-names All \
  > resultados/blue-service.json

aws_local sqs list-queue-tags \
  --queue-url "$BLUE" \
  > resultados/blue-tags.json
```

### 24.2. Comparación

Comprueba URL, ARN, timeout y etiquetas.

### 24.3. Formato

SQS devuelve muchos atributos como cadenas, aunque Terraform los presente como números.

### 24.4. Regla

Compara los valores y su significado, no solamente su representación textual.

---

## 25. Sesión 6: demostrar una observación antigua

El estado puede conservar un valor distinto al observado actualmente en el servicio.

### 25.1. Cambio externo

```bash
aws_local sqs set-queue-attributes \
  --queue-url "$BLUE" \
  --attributes VisibilityTimeout=120

terraform state show 'aws_sqs_queue.primary["blue"]'
```

### 25.2. Observación

El comando de estado puede seguir mostrando 60 segundos.

### 25.3. Detección y restauración

```bash
terraform plan -out=planes/restore-blue.tfplan
terraform show planes/restore-blue.tfplan
terraform apply planes/restore-blue.tfplan
```

### 25.4. Resultado

El plan debe corregir la diferencia hacia el valor declarado de 60 segundos.

---

## 26. Copia previa a modificaciones

Conserva una copia antes de mover o retirar relaciones.

### 26.1. Comandos

```bash
umask 077
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

terraform state pull \
  > "copias/before-mutations-${STAMP}.tfstate"

jq -e '
  type == "object" and
  has("lineage") and
  has("serial") and
  has("resources")
' "copias/before-mutations-${STAMP}.tfstate" >/dev/null
```

### 26.2. Protección

`umask 077` restringe los permisos de archivos nuevos en esta terminal.

### 26.3. Alcance

Esta comprobación sintáctica no certifica que la copia sea suficiente para una recuperación completa.

---

## 27. Inspección de metadatos

El estado incluye metadatos de identificación y evolución.

### 27.1. Consulta

```bash
terraform state pull > resultados/state-current.tfstate

jq '{version, terraform_version, lineage, serial}' \
  resultados/state-current.tfstate
```

### 27.2. Interpretación

- `lineage` identifica una línea de estado.
- `serial` representa una revisión persistida.
- `terraform_version` informa la versión registrada.
- `version` describe el formato interno.

### 27.3. Precaución

No esperes que cada comando incremente exactamente una unidad el serial.

### 27.4. Regla

No modifiques estos campos manualmente para eludir protecciones.

---

## 28. JSON de inspección y JSON de recuperación

Terraform ofrece formatos distintos para necesidades diferentes.

### 28.1. Comparación

| **Comando** | **Formato** | **Uso principal** |
|-------------|-------------|------------------|
| `state pull` | Estado del backend | Copia controlada |
| `show -json` | Representación de valores | Inspección |
| `show -json plan` | Representación del plan | Revisión automatizada |

Las representaciones no son intercambiables.

### 28.2. Exportación

```bash
terraform show -json > resultados/state-values.json
```

### 28.3. Advertencia

No utilices `state-values.json` como archivo para `terraform state push`.

---

## 29. Inventario JSON con módulos

Una configuración con módulos requiere recorrer sus hijos.

### 29.1. Consulta recursiva

```bash
jq -r '
  def resources:
    (.resources[]?),
    (.child_modules[]? | resources);

  .values.root_module |
  resources |
  select(.mode == "managed") |
  [.address, .type, .values.id] |
  @tsv
' resultados/state-values.json \
  > resultados/inventory.tsv
```

### 29.2. Resultado

El inventario debe incluir las cinco instancias, también las del módulo hijo.

### 29.3. Límite

La expresión inspecciona valores registrados; no consulta SQS.

### 29.4. Seguridad

El JSON completo puede contener información sensible en otros proyectos.

---

## 30. Sesión 7: preparar un movimiento

Renombraremos el recurso lógico `primary` a `jobs` sin cambiar las colas.

### 30.1. Comprobaciones previas

```bash
terraform plan
terraform state list aws_sqs_queue.primary
terraform state list aws_sqs_queue.jobs
terraform state pull > copias/before-primary-move.tfstate
```

### 30.2. Condiciones

El origen debe contener dos instancias.

El destino no debe tener recursos registrados.

### 30.3. Dry run

```bash
terraform state mv -dry-run \
  aws_sqs_queue.primary \
  aws_sqs_queue.jobs
```

### 30.4. Precaución

Esta simulación no garantiza que la configuración futura sea coherente.

---

## 31. Sesión 8: ejecutar el movimiento

La operación cambia las direcciones registradas, no los nombres de las colas.

### 31.1. Movimiento

```bash
terraform state mv \
  aws_sqs_queue.primary \
  aws_sqs_queue.jobs
```

### 31.2. Actualizar configuración

En `main.tf`, cambia el nombre lógico del bloque de `primary` a `jobs`.

En `outputs.tf`, cambia las referencias de `aws_sqs_queue.primary` a `aws_sqs_queue.jobs`.

### 31.3. No cambiar

Conserva las claves `blue` y `green` y las expresiones `name`.

### 31.4. Verificación

```bash
terraform fmt -recursive
terraform validate
terraform plan
```

---

## 32. Verificar identidad después del movimiento

La ausencia de recreación debe comprobarse mediante identificadores.

### 32.1. Consultas

```bash
terraform state show 'aws_sqs_queue.jobs["blue"]'
terraform state list -id="$BLUE"

aws_local sqs get-queue-attributes \
  --queue-url "$BLUE" \
  --attribute-names QueueArn VisibilityTimeout
```

### 32.2. Resultado esperado

La dirección cambia, pero la URL sigue correspondiendo a la cola original.

### 32.3. Plan

No debe proponer creación ni destrucción por el renombrado.

### 32.4. Precaución

No apliques un plan de reemplazo para resolver una refactorización que debería conservar identidad.

---

## 33. Alternativa declarativa con `moved`

Una migración también puede documentarse en la configuración.

### 33.1. Alternativa al procedimiento anterior

```hcl
moved {
  from = aws_sqs_queue.primary
  to   = aws_sqs_queue.jobs
}
```

### 33.2. Diferencia

El bloque permite revisar la migración mediante un plan.

`state mv` modifica el estado directamente.

### 33.3. No duplicar la práctica

No necesitas ejecutar otra migración sobre las relaciones que ya moviste.

### 33.4. Equipos

Un bloque `moved` puede conservarse para que otros estados realicen la misma refactorización.

### 33.5. Regla

Elige un procedimiento coherente y evita escritores concurrentes.

---

## 34. Sesión 9: mover una instancia de `for_each`

Cambiar una clave también cambia la dirección de la instancia.

### 34.1. Movimiento

```bash
terraform state pull > copias/before-key-move.tfstate

terraform state mv -dry-run \
  'aws_sqs_queue.jobs["green"]' \
  'aws_sqs_queue.jobs["secondary"]'

terraform state mv \
  'aws_sqs_queue.jobs["green"]' \
  'aws_sqs_queue.jobs["secondary"]'
```

### 34.2. Configuración

Sustituye el bloque `jobs` por el de la sección siguiente.

### 34.3. Precaución

No generes ni apliques cambios de infraestructura durante la ventana entre movimiento y actualización del código.

---

## 35. Separar clave lógica y nombre remoto

La nueva clave no debe obligar a cambiar el nombre existente de la cola.

### 35.1. Bloque actualizado

```hcl
resource "aws_sqs_queue" "jobs" {
  for_each = {
    blue      = "blue"
    secondary = "green"
  }

  name                       = "curso-state-${each.value}-${var.suffix}"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 86400
  tags = {
    Laboratory = "LocalStack"
    Group      = "primary"
  }
}
```

### 35.2. Verificación

Ejecuta `terraform validate` y `terraform plan`.

### 35.3. Resultado

`secondary` debe seguir relacionada con la URL que conservaste en `GREEN`.

---

## 36. Sesión 10: renombrar un módulo

Moveremos el módulo `messaging` a `communications`.

### 36.1. Comandos

```bash
terraform state pull > copias/before-module-move.tfstate

terraform state mv -dry-run \
  module.messaging \
  module.communications

terraform state mv \
  module.messaging \
  module.communications
```

### 36.2. Configuración

Renombra la llamada del módulo en `main.tf`.

Actualiza `module.messaging.urls` a `module.communications.urls` en `outputs.tf`.

### 36.3. Verificación

El plan no debe proponer recrear las dos colas del módulo.

---

## 37. Qué puede y qué no puede mover `state mv`

La herramienta modifica relaciones compatibles, no convierte cualquier recurso en otro.

### 37.1. Compatibilidad

Un movimiento de recurso exige tipos compatibles.

No convierte una cola SQS en una tabla DynamoDB.

### 37.2. Destino

La dirección de destino no debe estar ocupada por otra instancia incompatible.

### 37.3. Configuración

El destino debe quedar descrito por el código adecuado.

### 37.4. Ejemplo

Mover una instancia indexada a otra dirección exige revisar también `count` o `for_each`.

### 37.5. Regla

Antes de mover, documenta origen, destino, ID remoto y cambio de código correspondiente.

---

## 38. Sesión 11: retirar una relación con `state rm`

Desvincularemos temporalmente la cola de auditoría.

### 38.1. Preparación y operación

```bash
AUDIT="$(terraform output -raw audit_url)"
terraform state pull > copias/before-audit-rm.tfstate

terraform state rm -dry-run 'aws_sqs_queue.audit[0]'

terraform state rm 'aws_sqs_queue.audit[0]'
```

### 38.2. Resultado

La dirección desaparece del listado.

La cola sigue existiendo en LocalStack.

### 38.3. Verificación

Consulta `"$AUDIT"` mediante AWS CLI.

### 38.4. Advertencia

No apliques el siguiente plan de creación; recuperaremos la asociación.

---

## 39. Efectos de retirar una relación

La configuración determina qué ocurrirá en el siguiente plan.

### 39.1. Comparación

| **Situación** | **Plan posterior probable** | **Riesgo** |
|---------------|-----------------------------|-----------|
| Recurso retirado, bloque presente | Propuesta de creación | Conflicto o nueva asociación indirecta |
| Recurso retirado, bloque eliminado | Sin gestión del objeto | Recurso olvidado |
| Recurso importado de nuevo | Comparación con configuración | Ajustes no previstos |

El comportamiento concreto depende del recurso y del proveedor.

### 39.2. Verificación

Ejecuta `terraform plan` solo para observar la propuesta.

### 39.3. Regla

Una cola existente no debe recuperarse aplicando una creación sin estudiar su relación previa.

---

## 40. Sesión 12: recuperar mediante importación

La importación restablece una asociación con un objeto existente.

### 40.1. Comando

```bash
terraform import 'aws_sqs_queue.audit[0]' "$AUDIT"
```

### 40.2. Verificación

```bash
terraform state list
terraform state show 'aws_sqs_queue.audit[0]'
terraform plan
```

### 40.3. Resultado esperado

La dirección vuelve a estar administrada con la URL original.

### 40.4. Alcance

El bloque de configuración sigue siendo necesario.

### 40.5. Precaución

Importar no recupera mensajes eliminados ni garantiza ausencia de diferencias de atributos.

---

## 41. Alternativa: importación declarativa

Terraform permite revisar la importación mediante un bloque de configuración.

### 41.1. Ejemplo alternativo

```hcl
import {
  to = aws_sqs_queue.audit[0]
  id = "SUSTITUIR_POR_URL_REAL_DE_LA_COLA_LOCAL"
}
```

### 41.2. Procedimiento

Utiliza esta alternativa en una repetición independiente de la práctica.

### 41.3. No duplicar

No combines importación imperativa y declarativa para recuperar simultáneamente la misma relación.

### 41.4. Identificador

Sustituye el marcador por la URL obtenida del servicio o conservada antes de desvincular.

### 41.5. Verificación

Revisa el plan de importación y cualquier actualización adicional que proponga.

---

## 42. `state push`: propósito y protecciones

Este comando envía un archivo de estado al backend seleccionado.

### 42.1. Uso adecuado

Se reserva para recuperación o administración avanzada con un procedimiento explícito.

### 42.2. Protecciones

Terraform utiliza comprobaciones relacionadas con lineage y serial para evitar sustituciones incompatibles.

### 42.3. Riesgo

Enviar una copia antigua puede perder asociaciones o información reciente.

### 42.4. Laboratorio

No necesitas ejecutar `state push` para completar esta página.

### 42.5. Regla

No utilices `-force` para ignorar una advertencia sin investigar su causa y detener otros escritores.

---

## 43. `state replace-provider`

Este comando modifica asociaciones de proveedor registradas en el estado.

### 43.1. Qué cambia

La dirección de origen del proveedor utilizada por los recursos correspondientes.

### 43.2. Qué no hace

No actualiza automáticamente toda la configuración ni convierte los esquemas de recursos arbitrariamente.

### 43.3. Caso de uso

Una migración hacia un proveedor compatible puede requerir revisar estas asociaciones.

### 43.4. Inspección segura

```bash
terraform providers
terraform state replace-provider -help
```

### 43.5. Alcance

No sustituiremos el proveedor AWS en esta práctica.

---

## 44. Bloqueo, backups y concurrencia

Las modificaciones de estado requieren coordinación además de comandos correctos.

### 44.1. Bloqueo

Terraform utiliza bloqueo cuando el backend lo soporta.

### 44.2. Backend local

El bloqueo local no coordina automáticamente dos copias independientes del proyecto.

### 44.3. Backups

Los comandos que escriben estado ofrecen mecanismos de copia; conserva también una copia previa identificada.

### 44.4. Precaución

No ejecutes `apply`, importaciones y modificaciones de estado simultáneamente.

### 44.5. Regla

No utilices `-lock=false` para resolver un problema de concurrencia sin corregir primero su causa.

---

## 45. Workspace, backend y contexto

Un comando correcto puede operar sobre el estado equivocado si el contexto no es el esperado.

### 45.1. Comprobaciones previas

```bash
pwd
terraform workspace show
terraform providers
terraform state list
```

### 45.2. Directorio

El directorio de trabajo determina la configuración y la inicialización utilizadas.

### 45.3. Workspace

Selecciona un estado distinto dentro del backend compatible.

### 45.4. Backend

La configuración del proveedor no define automáticamente dónde se almacena el estado.

### 45.5. Regla

Comprueba el contexto antes de copiar, mover, retirar o restaurar relaciones.

---

## 46. Sesión 13: automatizar la revisión posterior

Un plan completo permite detectar incoherencias después de las operaciones.

### 46.1. Comandos

```bash
terraform fmt -recursive
terraform validate

set +e
terraform plan -detailed-exitcode \
  -out=planes/post-state-operations.tfplan
CODE=$?
set -e

printf 'Código de plan: %s\n' "$CODE"
```

### 46.2. Interpretación

- `0`: plan sin cambios.
- `1`: error.
- `2`: cambios propuestos.

### 46.3. Precaución

No confundas el código `2` con un fallo técnico de Terraform.

---

## 47. Inventario final y diagnóstico

Comprueba que todas las relaciones esperadas siguen presentes.

### 47.1. Direcciones finales

```text
aws_sqs_queue.audit[0]
aws_sqs_queue.jobs["blue"]
aws_sqs_queue.jobs["secondary"]
module.communications.aws_sqs_queue.queue["events"]
module.communications.aws_sqs_queue.queue["notifications"]
```

### 47.2. Verificaciones

El total debe seguir siendo cinco.

Las URLs deben corresponder a los objetos originales.

### 47.3. Problemas frecuentes

Revisa comillas, índices, referencias antiguas, destinos ocupados y contexto del backend.

### 47.4. Regla

No edites el JSON del estado manualmente para corregir un error de dirección.

---

## 48. Limpieza del laboratorio

Mantén LocalStack disponible durante la destrucción.

### 48.1. Secuencia revisada

```bash
terraform plan -destroy -out=planes/destroy.tfplan
terraform show planes/destroy.tfplan
terraform apply planes/destroy.tfplan
terraform state list
aws_local sqs list-queues
docker compose down
```

### 48.2. Condición previa

Las cinco colas deben estar vinculadas al estado.

### 48.3. Recursos desvinculados

Terraform no elimina automáticamente objetos retirados mediante `state rm`.

### 48.4. Precaución

Borrar el estado no destruye las colas ni sustituye este procedimiento.

---

## 49. Diferencias respecto a AWS real

La emulación permite practicar relaciones de gestión, no certificar operaciones de producción.

### 49.1. Aspectos adicionales

En AWS real revisa:

- IAM y credenciales.
- Propagación de cambios.
- Backends remotos protegidos.
- Historial y recuperación.
- Restricciones de los servicios.
- Recursos compartidos.
- Conservación de datos.
- Auditoría de operaciones.

### 49.2. Persistencia local

Eliminar LocalStack puede hacer desaparecer objetos mientras Terraform conserva sus relaciones.

### 49.3. Límite

El estado no es un backup de los mensajes ni del entorno completo.

---

## 50. Ejercicios, evaluación y resumen

Consolida la inspección antes de utilizar comandos de modificación en proyectos mayores.

### 50.1. Ejercicios

1. Filtra recursos por módulo y dirección exacta.
2. Busca una relación por ID del proveedor.
3. Genera un inventario JSON recursivo.
4. Renombra un recurso sin recrear objetos.
5. Cambia una clave de `for_each` conservando el nombre remoto.
6. Desvincula e importa una cola.
7. Documenta riesgos de concurrencia y contexto incorrecto.
8. Destruye y verifica todos los recursos.

### 50.2. Criterio de evaluación

Entrega inventarios inicial y final, copias controladas, planes revisados y evidencia de conservación de identidad.

### 50.3. Idea final

**Los comandos `state` permiten inspeccionar y reorganizar relaciones de gestión; su uso seguro exige contexto correcto, copia previa, configuración coherente y verificación posterior.**