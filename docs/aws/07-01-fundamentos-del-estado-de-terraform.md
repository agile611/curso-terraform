# Fundamentos del estado de Terraform con LocalStack

Terraform necesita relacionar los recursos declarados en los archivos de configuración con los objetos que administra.

Esa relación se conserva en el estado, habitualmente llamado *state*.

El estado permite identificar recursos, comparar cambios y mantener información necesaria para futuras operaciones.

Sin embargo, no sustituye a la configuración ni representa una copia completa de los servicios administrados.

En esta lección construirás un laboratorio con colas SQS para observar el estado de forma controlada.

Después practicarás inspección, detección de cambios externos, renombrado de recursos, importación y recuperación.

LocalStack permitirá ejecutar las operaciones contra una emulación local de AWS.

La práctica se centra en comprender qué cambia en la configuración, qué cambia en el estado y qué cambia en el servicio.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> No ejecutes operaciones de estado sobre proyectos ajenos o entornos de producción.

---

## 1. Objetivos de aprendizaje

Esta lección desarrolla una base práctica para administrar infraestructura sin perder sus relaciones de gestión.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Explicar para qué sirve el estado.
- Diferenciar configuración, estado y recursos reales.
- Inspeccionar recursos administrados.
- Crear copias controladas del estado.
- Detectar modificaciones externas.
- Interpretar un plan de actualización del estado.
- Renombrar direcciones sin recrear recursos.
- Desvincular e importar recursos.
- Reconocer riesgos de concurrencia y pérdida del estado.

### 1.2. Resultado práctico

Administrarás dos colas SQS y comprobarás cómo cambia su relación con Terraform.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos básicos de Terraform.

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

Debes reconocer recursos, variables, outputs, referencias y planes guardados.

Los comandos utilizan Bash y se ejecutan desde el host.

---

## 3. Compatibilidad del laboratorio

El docente debe validar la combinación concreta antes de distribuir la práctica.

### 3.1. Operaciones obligatorias

Comprueba:

- Creación y consulta de colas SQS.
- Modificación de atributos.
- Lectura de etiquetas.
- Eliminación de colas.
- Importación de una cola mediante su URL.
- Lectura del recurso por el proveedor.
- Aplicación de cambios detectados.
- Destrucción de los recursos administrados.

### 3.2. Registro del entorno

Documenta Terraform, proveedor AWS, Docker, AWS CLI e imagen o digest de LocalStack.

### 3.3. Alcance

El estado pertenece a Terraform; LocalStack emula los servicios administrados, no el motor de estado.

---

## 4. Configuración, estado y recursos

El diagnóstico comienza separando tres representaciones de la infraestructura.

### 4.1. Comparación

| **Representación** | **Dónde está** | **Qué expresa** |
|--------------------|----------------|-----------------|
| Configuración | Archivos `.tf` | Intención declarada |
| Estado | Backend seleccionado | Relaciones y atributos registrados |
| Recursos reales | API del servicio | Objetos existentes y sus propiedades |

En esta práctica, los recursos reales del laboratorio existen en LocalStack.

### 4.2. Diferencia fundamental

Editar un archivo no modifica inmediatamente el servicio.

### 4.3. Operación declarativa

Terraform utiliza configuración, estado y consultas al proveedor para preparar un plan.

### 4.4. Regla

**No confundas la intención declarada con la última información registrada ni con la situación actual del servicio.**

---

## 5. Qué conserva el estado

El estado contiene información necesaria para mantener las relaciones de gestión.

### 5.1. Información habitual

Puede incluir:

- Direcciones Terraform.
- Identificadores del proveedor.
- Atributos de recursos.
- Outputs.
- Relaciones internas.
- Información privada del proveedor.
- Metadatos del propio estado.

### 5.2. Ejemplo

Terraform puede relacionar `aws_sqs_queue.work` con una URL de cola concreta.

### 5.3. Límite

El estado no contiene necesariamente todos los datos almacenados dentro del recurso.

---

## 6. Qué no es el estado

El estado no debe tratarse como una copia universal de la infraestructura.

### 6.1. No sustituye a

- Los archivos de configuración.
- Los documentos de arquitectura.
- Los backups de datos.
- Los logs de aplicación.
- Los artefactos desplegados.
- Los procedimientos de recuperación.

### 6.2. Ejemplo con SQS

Un estado con la URL de una cola no es un backup de sus mensajes.

### 6.3. Ejemplo con DynamoDB

Registrar una tabla no implica conservar todos sus elementos.

### 6.4. Consecuencia

La recuperación de infraestructura y la recuperación de datos requieren estrategias diferentes.

---

## 7. Direcciones e identificadores

Terraform y el servicio utilizan identificadores con responsabilidades distintas.

### 7.1. Comparación

| **Identificador** | **Ejemplo conceptual** | **Responsabilidad** |
|-------------------|-------------------------|--------------------|
| Dirección Terraform | `aws_sqs_queue.work` | Identificar una instancia administrada |
| ID del proveedor | URL de cola | Localizar el objeto para operaciones |
| Nombre del servicio | `curso-state-work-alumno01` | Identidad visible del recurso |
| ARN | ARN de cola | Referencias y autorizaciones AWS |

El identificador de importación depende del tipo de recurso.

### 7.2. Dirección

Cambiar `work` por `jobs` cambia la dirección Terraform.

### 7.3. Nombre remoto

Ese cambio no obliga a cambiar el nombre de la cola si gestionas correctamente la relación.

### 7.4. Regla

No presupongas que dirección, nombre, ARN e ID son intercambiables.

---

## 8. Estado local y backend

El backend determina dónde se conserva el estado y cómo se accede a él.

### 8.1. Laboratorio

Utilizaremos el backend local predeterminado.

### 8.2. Ubicación habitual

En el workspace predeterminado aparecerá:

```text
terraform.tfstate
```

### 8.3. Backend remoto

Otros backends conservan el estado en un servicio remoto.

### 8.4. Distinción

El proveedor AWS y el backend son configuraciones separadas.

### 8.5. Alcance

Configurar endpoints locales del proveedor no configura automáticamente un backend S3 local.

---

## 9. Seguridad del estado

El estado puede contener información sensible aunque los comandos oculten ciertos valores.

### 9.1. Riesgos

Puede incluir:

- Contraseñas generadas.
- Variables de entorno.
- Atributos secretos.
- Identificadores internos.
- Datos de configuración.
- Outputs marcados como sensibles.

### 9.2. Marca `sensitive`

Esta marca controla determinadas presentaciones, pero no cifra automáticamente el valor en el estado.

### 9.3. Laboratorio

Utilizaremos únicamente nombres, etiquetas y credenciales ficticias.

### 9.4. Regla

Protege también copias, exports y planes: pueden contener información equivalente.

---

## 10. Preparación del directorio

Trabaja en una carpeta independiente.

### 10.1. Crear estructura

```bash
mkdir -p terraform-state-localstack/planes
mkdir -p terraform-state-localstack/resultados
mkdir -p terraform-state-localstack/copias
cd terraform-state-localstack
```

### 10.2. Organización

La raíz contendrá Terraform y Docker Compose.

### 10.3. Aislamiento

No copies el estado de otra práctica para comenzar esta lección.

### 10.4. Ejecución

Todos los comandos se ejecutarán desde este directorio, salvo que se indique lo contrario.

---

## 11. Protección de archivos

Separa configuración versionable y artefactos operativos.

### 11.1. `.gitignore`

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

### 11.2. Qué conservar

Versiona los archivos `.tf`, entradas ficticias y `.terraform.lock.hcl`.

### 11.3. Precaución

Un `.gitignore` no elimina un archivo que ya estuviera registrado en Git.

---

## 12. Imagen de LocalStack

Utiliza una imagen validada por el docente.

### 12.1. Selección

Sustituye el marcador:

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 12.2. Reproducibilidad

Utiliza una etiqueta fija o un digest.

### 12.3. Aislamiento

El laboratorio no necesita montar el socket Docker dentro de LocalStack.

### 12.4. Motivo

Solo utilizaremos SQS; no ejecutaremos runtimes Lambda.

---

## 13. Docker Compose

La configuración publica LocalStack únicamente en la interfaz local.

### 13.1. `compose.yaml`

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

### 13.2. Arranque

Ejecuta `docker compose up -d` y comprueba `docker compose ps`.

### 13.3. Persistencia

No presuponemos persistencia de recursos después de eliminar el contenedor.

---

## 14. Credenciales y conectividad

Prepara la terminal antes de utilizar AWS CLI.

### 14.1. Configuración

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_PAGER=""
unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE

aws_local() {
  aws --endpoint-url=http://localhost:4566 --region us-east-1 "$@"
}
```

### 14.2. Consulta inicial

Ejecuta:

```bash
aws_local sqs list-queues
```

### 14.3. Continuación

Espera una respuesta válida antes de desplegar Terraform.

---

## 15. Requisitos de Terraform

Crea `versions.tf`.

### 15.1. Configuración

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

### 15.2. Versiones

La restricción permite versiones AWS 5.x.

### 15.3. Bloqueo

Conserva la versión seleccionada en `.terraform.lock.hcl`.

---

## 16. Proveedor con endpoint local

Crea `providers.tf`.

### 16.1. Configuración

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

### 16.2. Alcance

El proveedor solo utilizará SQS en esta práctica.

### 16.3. Precaución

No añadas recursos de otros servicios sin configurar y revisar sus endpoints.

---

## 17. Variables e identidad

Crea `variables.tf` y `terraform.tfvars`.

### 17.1. Declaración

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

### 17.2. Entrada

```hcl
suffix = "alumno01"
```

### 17.3. Entorno compartido

Alumnos que compartan LocalStack necesitan sufijos diferentes.

---

## 18. Recursos del laboratorio

Crea `main.tf` con dos colas independientes.

### 18.1. Configuración

```hcl
resource "aws_sqs_queue" "work" {
  name                       = "curso-state-work-${var.suffix}"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 86400

  tags = {
    Laboratory = "LocalStack"
    ManagedBy  = "Terraform"
    Purpose    = "work"
  }
}

resource "aws_sqs_queue" "audit" {
  name                       = "curso-state-audit-${var.suffix}"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 86400

  tags = {
    Laboratory = "LocalStack"
    ManagedBy  = "Terraform"
    Purpose    = "audit"
  }
}
```

### 18.2. Alcance

No configuraremos DLQ, suscripciones ni consumidores.

---

## 19. Outputs del proyecto

Crea `outputs.tf`.

### 19.1. Configuración

```hcl
output "queue_url" {
  value = aws_sqs_queue.work.id
}

output "audit_url" {
  value = aws_sqs_queue.audit.id
}

output "queue_arn" {
  value = aws_sqs_queue.work.arn
}
```

### 19.2. Utilidad

Los outputs facilitan obtener identificadores sin copiarlos manualmente.

### 19.3. Precaución

Un output leído del estado no demuestra que el recurso siga existiendo.

---

## 20. Sesión 1: inicialización y plan

Duración orientativa: 15 minutos.

### 20.1. Secuencia

```bash
terraform init
terraform fmt -recursive
terraform validate
terraform workspace show
terraform plan -out=planes/create.tfplan
terraform show planes/create.tfplan
```

### 20.2. Resultado esperado

El plan debe proponer la creación de dos recursos.

### 20.3. Workspace

Debe estar seleccionado `default`.

### 20.4. Distinción

Un plan de creación no crea las colas.

---

## 21. Sesión 2: aplicación y primera inspección

La aplicación materializa la infraestructura declarada y registra las relaciones.

### 21.1. Comandos

```bash
terraform apply planes/create.tfplan
terraform state list
terraform output
```

### 21.2. Direcciones esperadas

```text
aws_sqs_queue.audit
aws_sqs_queue.work
```

### 21.3. Identificadores

```bash
QUEUE="$(terraform output -raw queue_url)"
AUDIT="$(terraform output -raw audit_url)"
```

### 21.4. Verificación independiente

Consulta ambas colas mediante AWS CLI antes de continuar.

---

## 22. Sesión 3: consultar un recurso del estado

`terraform state show` presenta los atributos registrados para una dirección.

### 22.1. Comando

```bash
terraform state show aws_sqs_queue.work \
  > resultados/work-state.txt

cat resultados/work-state.txt
```

### 22.2. Qué buscar

Identifica:

- `id`.
- `arn`.
- `name`.
- `visibility_timeout_seconds`.
- `tags`.

### 22.3. Límite

Este comando no realiza una comprobación completa del recurso en SQS.

### 22.4. Distinción

Para conocer la situación del servicio necesitas consultar su API o ejecutar un plan con actualización.

---

## 23. Sesión 4: consultar la representación del servicio

AWS CLI proporciona otra fuente de evidencia.

### 23.1. Consulta

```bash
aws_local sqs get-queue-attributes \
  --queue-url "$QUEUE" \
  --attribute-names All \
  > resultados/work-service.json

aws_local sqs list-queue-tags \
  --queue-url "$QUEUE" \
  > resultados/work-tags.json
```

### 23.2. Lectura

Ejecuta `jq '.'` sobre ambos archivos.

### 23.3. Comparación

El servicio suele representar atributos SQS como cadenas.

### 23.4. Regla

Compara significado y valores, no solamente el formato textual.

---

## 24. Copia controlada del estado

Antes de operaciones delicadas, conserva una copia identificable.

### 24.1. Comandos

```bash
umask 077
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

terraform state pull \
  > "copias/state-${STAMP}.json"

jq -e '.version and .lineage and .serial != null' \
  "copias/state-${STAMP}.json" >/dev/null
```

### 24.2. Protección

`umask 077` restringe permisos de archivos nuevos en esta terminal.

### 24.3. Alcance

La copia contiene el estado, no los mensajes SQS.

### 24.4. Procedimiento

Registra también configuración, versión de Terraform y contexto de la copia.

---

## 25. Formato interno y formato de presentación

Terraform ofrece distintas representaciones JSON.

### 25.1. Comparación

| **Comando** | **Representación** | **Uso recomendado** |
|-------------|--------------------|--------------------|
| `terraform state pull` | Estado para el backend | Copia y recuperación controlada |
| `terraform show -json` | Representación de valores | Inspección y automatización |
| `terraform show -json plan` | Representación del plan | Revisión de cambios |

No son formatos intercambiables.

### 25.2. Precaución

La salida de `terraform show -json` no es un reemplazo directo del archivo de estado.

### 25.3. Regla

Utiliza comandos de Terraform para modificar relaciones; no edites JSON internamente a mano.

---

## 26. Metadatos: lineage y serial

El estado contiene metadatos que ayudan a identificar su evolución.

### 26.1. Inspección

```bash
terraform state pull > resultados/state-current.json

jq '{version, terraform_version, lineage, serial}' \
  resultados/state-current.json
```

### 26.2. Lineage

Identifica una línea de estado.

### 26.3. Serial

Representa una revisión del estado y puede aumentar al persistir cambios.

### 26.4. Precaución

No esperes que cualquier comando aumente exactamente una unidad el serial.

### 26.5. Recuperación

Estos metadatos ayudan a detectar copias incompatibles o antiguas.

---

## 27. Sesión 5: plan sin cambios

Comprueba la estabilidad antes de introducir modificaciones externas.

### 27.1. Comando

```bash
terraform plan
```

### 27.2. Resultado esperado

Terraform debe indicar que no hay cambios necesarios.

### 27.3. Significado

La configuración y los atributos observados no requieren acciones administradas en ese momento.

### 27.4. Límite

No significa que el sistema completo esté sano ni que todos sus datos sean correctos.

### 27.5. Alcance

Terraform evalúa lo que modelan la configuración y el proveedor.

---

## 28. Sesión 6: provocar drift

Una modificación externa puede separar el servicio de la configuración.

### 28.1. Cambio mediante AWS CLI

```bash
aws_local sqs set-queue-attributes \
  --queue-url "$QUEUE" \
  --attributes VisibilityTimeout=120
```

### 28.2. Verificación

```bash
aws_local sqs get-queue-attributes \
  --queue-url "$QUEUE" \
  --attribute-names VisibilityTimeout
```

### 28.3. Resultado

El servicio debe mostrar 120 segundos.

### 28.4. Estado previo

Antes de actualizar sus observaciones, Terraform puede seguir teniendo registrado el valor anterior.

---

## 29. Sesión 7: detectar y corregir drift

Un plan normal consulta recursos y compara la situación observada con la intención declarada.

### 29.1. Secuencia

```bash
terraform plan -out=planes/restore-timeout.tfplan
terraform show planes/restore-timeout.tfplan
terraform apply planes/restore-timeout.tfplan
```

### 29.2. Resultado esperado

Terraform debe proponer restaurar el valor declarado de 60 segundos.

### 29.3. Evidencia

Consulta SQS después de aplicar.

### 29.4. Distinción

La actualización durante el plan informa sus cálculos; la persistencia del estado no debe inferirse de cualquier archivo de salida.

### 29.5. Regla

Revisa el plan guardado antes de autorizar su aplicación.

---

## 30. Sesión 8: aceptar observaciones en el estado

Un plan `refresh-only` permite actualizar el estado sin corregir el recurso hacia la configuración.

### 30.1. Cambio y plan

```bash
aws_local sqs set-queue-attributes \
  --queue-url "$QUEUE" \
  --attributes VisibilityTimeout=120

terraform plan -refresh-only \
  -out=planes/refresh-only.tfplan

terraform show planes/refresh-only.tfplan
terraform apply planes/refresh-only.tfplan
```

### 30.2. Resultado

El estado registra el valor observado de 120 segundos.

### 30.3. Configuración

El archivo `.tf` sigue declarando 60 segundos.

---

## 31. Qué significa `refresh-only`

Aceptar observaciones no equivale a editar la intención declarada.

### 31.1. Comparación

| **Operación** | **Estado** | **Recurso** |
|---------------|------------|-------------|
| Aplicar plan normal | Se actualiza según resultado | Puede modificarse |
| Aplicar `refresh-only` | Adopta observaciones | No ejecuta cambios correctivos |
| Editar `.tf` | No cambia inmediatamente | No cambia inmediatamente |

La configuración sigue siendo una representación separada.

### 31.2. Comprobación

Ejecuta otro plan normal: debe proponer volver a 60 segundos.

### 31.3. Restauración

Revisa y aplica ese plan para dejar el laboratorio estable.

### 31.4. Precaución

No uses actualización del estado como sustituto de una decisión sobre el drift.

---

## 32. Sesión 9: renombrar una dirección

Cambiar el nombre lógico de un recurso requiere conservar su relación con el objeto existente.

### 32.1. Cambio de configuración

En `main.tf`, cambia:

```hcl
resource "aws_sqs_queue" "work" {
```

por:

```hcl
resource "aws_sqs_queue" "jobs" {
```

### 32.2. Referencias

En `outputs.tf`, sustituye `aws_sqs_queue.work` por `aws_sqs_queue.jobs`.

### 32.3. Nombre remoto

No cambies la expresión `name` de la cola.

### 32.4. Advertencia

Todavía no apliques un plan que proponga eliminar y crear la cola.

---

## 33. Bloque `moved`

Declara el cambio de dirección mediante una migración explícita.

### 33.1. `migrations.tf`

```hcl
moved {
  from = aws_sqs_queue.work
  to   = aws_sqs_queue.jobs
}
```

### 33.2. Revisión

```bash
terraform plan -out=planes/rename.tfplan
terraform show planes/rename.tfplan
terraform apply planes/rename.tfplan
```

### 33.3. Resultado esperado

Debe mostrar el movimiento de dirección sin recrear la cola.

### 33.4. Verificación

`terraform state list` debe mostrar `aws_sqs_queue.jobs`.

---

## 34. Movimiento imperativo y declarativo

Terraform también permite mover relaciones mediante comandos.

### 34.1. Alternativa conceptual

```bash
terraform state mv \
  aws_sqs_queue.work \
  aws_sqs_queue.jobs
```

### 34.2. No repetir

No ejecutes ese movimiento después de haber aplicado el bloque `moved` anterior.

### 34.3. Diferencia

El comando modifica el estado directamente.

El bloque documenta la migración en la configuración.

### 34.4. Equipos

Mantener bloques `moved` puede permitir que otros estados recorran la misma migración.

### 34.5. Regla

Elige un procedimiento y comprueba dirección de origen y destino antes de ejecutarlo.

---

## 35. Sesión 10: desvincular un recurso

`terraform state rm` elimina una relación de gestión, no el recurso remoto.

### 35.1. Preparación

```bash
terraform state pull > copias/before-state-rm.json
terraform state rm -dry-run aws_sqs_queue.audit
```

### 35.2. Operación

```bash
terraform state rm aws_sqs_queue.audit
terraform state list
```

### 35.3. Verificación

Consulta la cola `"$AUDIT"` mediante AWS CLI: debe seguir existiendo.

### 35.4. Precaución

El bloque de configuración sigue presente, por lo que un plan puede proponer creación.

### 35.5. Regla

No apliques ese plan; recuperaremos la relación mediante importación.

---

## 36. Sesión 11: importar la cola existente

La importación conecta una dirección Terraform con un objeto que ya existe.

### 36.1. Comando

```bash
terraform import aws_sqs_queue.audit "$AUDIT"
```

### 36.2. Verificación

```bash
terraform state show aws_sqs_queue.audit
terraform plan
```

### 36.3. Resultado esperado

La dirección vuelve a estar administrada.

### 36.4. Atributos

El plan permite detectar diferencias entre la configuración y lo importado.

### 36.5. Alcance

Importar no garantiza que el código existente describa perfectamente el recurso.

---

## 37. Importación declarativa

Terraform también admite bloques `import` para un flujo basado en plan.

### 37.1. Alternativa

```hcl
import {
  to = aws_sqs_queue.audit
  id = "SUSTITUIR_POR_URL_REAL_DE_LA_COLA_LOCAL"
}
```

### 37.2. Procedimiento

En una repetición independiente, desvincula la cola con copia previa y aplica un plan de importación revisado.

### 37.3. No duplicar

No ejecutes simultáneamente importación imperativa y declarativa para recuperar la misma relación.

### 37.4. Configuración

El bloque `resource` sigue siendo necesario para gestionar el objeto.

### 37.5. Regla

Una importación recupera una relación; no recupera mensajes perdidos ni datos eliminados.

---

## 38. Sesión 12: eliminar fuera de Terraform

Esta prueba observa un objeto que desaparece del servicio.

### 38.1. Eliminación externa

```bash
aws_local sqs delete-queue --queue-url "$AUDIT"
```

### 38.2. Plan

```bash
terraform plan -out=planes/recreate-audit.tfplan
terraform show planes/recreate-audit.tfplan
```

### 38.3. Resultado esperado

Terraform debe detectar la ausencia y proponer crear nuevamente la cola declarada.

### 38.4. Recuperación

Aplica el plan y actualiza `AUDIT` mediante el output.

### 38.5. Precaución

Una cola recreada no recupera los mensajes de la cola eliminada.

---

## 39. Identificadores que parecen iguales

La igualdad textual de un identificador no demuestra continuidad del objeto.

### 39.1. Ejemplo

Una cola recreada con el mismo nombre puede producir una URL similar o idéntica.

### 39.2. Historial

El objeto anterior fue eliminado aunque su nombre vuelva a utilizarse.

### 39.3. Datos

Los mensajes previos no quedan recuperados por esa coincidencia.

### 39.4. Terraform

El proveedor identifica el objeto utilizando el mecanismo definido para ese recurso.

### 39.5. Regla

Distingue identidad administrativa, continuidad operacional y conservación de datos.

---

## 40. Sesión 13: copia y recuperación del backend local

Practica pérdida del archivo solo en este laboratorio y con recursos estables.

### 40.1. Preparación y recuperación

```bash
terraform plan
terraform state pull > copias/recovery-source.tfstate

mv terraform.tfstate copias/terraform.tfstate-displaced

# No ejecutar apply, import ni comandos que escriban otro estado.
cp copias/recovery-source.tfstate terraform.tfstate

terraform state list
terraform plan
```

### 40.2. Condición

No debe haber otros procesos utilizando el mismo directorio durante la prueba.

### 40.3. Resultado

El plan debe confirmar las relaciones restauradas.

### 40.4. Alcance

Este procedimiento corresponde al backend local predeterminado, no a cualquier backend.

---

## 41. Recuperación sin copia disponible

Si se pierde el estado, el código no permite reconstruir automáticamente todas las relaciones.

### 41.1. Procedimiento orientativo

1. Detén aplicaciones concurrentes.
2. Localiza recursos existentes.
3. Identifica sus IDs de importación.
4. Comprueba qué configuración les corresponde.
5. Importa cada recurso soportado.
6. Revisa todos los cambios del plan.
7. Documenta relaciones recuperadas y pendientes.

### 41.2. Riesgo

Aplicar inmediatamente desde un estado vacío puede proponer crear recursos que ya existen.

### 41.3. Límite

No todos los atributos o relaciones se recuperan con la misma facilidad.

### 41.4. Producción

Prioriza restauración desde un backend protegido con historial antes de reconstrucción manual.

---

## 42. `state push` y restauraciones avanzadas

`terraform state push` permite enviar un estado al backend seleccionado.

### 42.1. Uso

Es una herramienta de recuperación o administración avanzada, no una operación cotidiana.

### 42.2. Protecciones

Terraform comprueba condiciones relacionadas con lineage y serial para evitar sustituciones incompatibles.

### 42.3. Riesgo

Forzar una copia antigua puede perder relaciones o información reciente.

### 42.4. Laboratorio

No necesitas `state push` para completar la recuperación local anterior.

### 42.5. Regla

No utilices `-force` para ignorar una advertencia sin investigar la discrepancia.

---

## 43. Bloqueo y concurrencia

Dos escritores pueden producir decisiones incompatibles sobre el mismo estado.

### 43.1. Bloqueo

Terraform utiliza mecanismos de bloqueo cuando el backend los soporta.

### 43.2. Backend local

El bloqueo local no convierte dos copias independientes del directorio en un sistema coordinado.

### 43.3. Copias separadas

Dos estados pueden intentar administrar el mismo recurso remoto sin compartir bloqueo.

### 43.4. Precaución

Evita ejecutar `apply`, importaciones y comandos de modificación de estado simultáneamente.

### 43.5. Regla

El bloqueo protege operaciones de estado; no sustituye coordinación y revisión de cambios.

---

## 44. Workspaces y backend remoto

Estas capacidades amplían la administración, pero requieren diseño explícito.

### 44.1. Workspaces

Cada workspace selecciona un estado distinto dentro del backend compatible.

### 44.2. Inspección

```bash
terraform workspace list
terraform workspace show
```

### 44.3. Precaución

Cambiar de workspace no cambia automáticamente nombres remotos ni credenciales.

### 44.4. Backend remoto

Una migración requiere revisar endpoints, permisos, cifrado, historial y bloqueo.

### 44.5. Alcance

No migraremos a S3 en esta lección; ese procedimiento necesita un laboratorio independiente.

---

## 45. Comandos que requieren especial atención

Algunas herramientas afectan decisiones o relaciones importantes.

### 45.1. Comparación

| **Opción o comando** | **Riesgo principal** | **Uso prudente** |
|---------------------|----------------------|-----------------|
| `state rm` | Recurso deja de estar administrado | Desvinculación planificada |
| `state mv` | Dirección incorrecta | Migración revisada |
| `state push` | Sustitución de estado | Recuperación controlada |
| `-refresh=false` | Observaciones antiguas | Casos específicos |
| `-target` | Plan parcial | Situaciones excepcionales |

No sustituyen un plan completo posterior.

### 45.2. `force-unlock`

Solo debe utilizarse cuando se ha demostrado que el bloqueo está abandonado y el backend lo permite.

### 45.3. Regla

Nunca desbloquees un estado que otro proceso sigue escribiendo.

---

## 46. Planes guardados y automatización

Un plan guardado representa decisiones preparadas bajo un contexto concreto.

### 46.1. Aplicación

Terraform puede rechazar un plan si el estado cambió de forma incompatible después de generarlo.

### 46.2. Servicio externo

Cambios fuera de Terraform pueden ocurrir aunque el estado no haya sido escrito por otro proceso.

### 46.3. Precaución

No trates un plan antiguo como una comprobación reciente del entorno.

### 46.4. Automatización

`terraform plan -detailed-exitcode` distingue error, ausencia de cambios y presencia de cambios.

### 46.5. Seguridad

Los planes pueden contener valores sensibles y requieren protección equivalente al estado.

---

## 47. Sesión 14: inspección automatizable

Exporta una representación de lectura para resumir el estado administrado.

### 47.1. Comandos

```bash
terraform show -json > resultados/state-values.json

jq -r '
  .values.root_module.resources[]? |
  [.address, .type, .values.id] |
  @tsv
' resultados/state-values.json
```

### 47.2. Alcance

La expresión está diseñada para los recursos del módulo raíz de este laboratorio.

### 47.3. Módulos

Una configuración con módulos hijos necesita recorrer también `child_modules`.

### 47.4. Precaución

No publiques el JSON completo ni lo utilices como archivo para restaurar el backend.

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

### 48.2. Condición previa

Ambas colas deben estar vinculadas al estado antes de destruir.

### 48.3. Desvinculados

Terraform no elimina automáticamente recursos que fueron retirados del estado.

### 48.4. Precaución

Borrar `terraform.tfstate` no destruye las colas ni sustituye esta secuencia.

---

## 49. Diferencias respecto a AWS real

La emulación permite practicar relaciones de gestión, no certificar operaciones de producción.

### 49.1. Aspectos adicionales

En AWS real revisa:

- Credenciales e IAM.
- Propagación de cambios.
- Retención y backups de datos.
- Restricciones de recreación.
- Costes y cuotas.
- Backend remoto protegido.
- Auditoría y control de acceso.

### 49.2. Persistencia local

Eliminar LocalStack puede hacer desaparecer recursos mientras Terraform conserva sus relaciones.

### 49.3. Interpretación

El siguiente plan puede proponer recreación; eso no significa que el estado sea un backup del entorno.

---

## 50. Ejercicios, evaluación y resumen

Consolida las relaciones antes de practicar operaciones avanzadas.

### 50.1. Ejercicios

1. Compara configuración, estado y atributos SQS.
2. Provoca y corrige drift.
3. Aplica un plan `refresh-only` y explica su límite.
4. Renombra una dirección mediante `moved`.
5. Desvincula e importa una cola.
6. Recupera el backend local desde una copia.
7. Documenta riesgos de dos estados para un recurso.
8. Destruye y verifica el laboratorio.

### 50.2. Criterio de evaluación

Entrega evidencias de planes revisados, relaciones recuperadas y ausencia de recursos pendientes del laboratorio.

### 50.3. Idea final

**El estado conserva las relaciones de gestión de Terraform: protegerlo, interpretarlo y modificarlo con procedimientos explícitos es esencial para administrar infraestructura de forma segura.**