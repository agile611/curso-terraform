# `count`, `for_each` y condicionales en Terraform

Terraform permite crear varias instancias a partir de una misma declaración.

También permite decidir qué recursos deben existir según los valores de entrada.

Estas capacidades reducen repetición, pero introducen una decisión importante: cómo identificar cada instancia.

`count` utiliza índices numéricos.

`for_each` utiliza claves.

Las expresiones condicionales seleccionan valores o colecciones.

En esta lección estudiarás sus diferencias y practicarás con recursos S3 en LocalStack.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.

---

## 1. Objetivos

Esta lección combina diseño de instancias, interpretación de planes y prácticas de terminal.

### 1.1. Objetivos de aprendizaje

Al finalizar podrás:

- Crear varias instancias mediante `count`.
- Consultar instancias mediante índices.
- Crear instancias mediante `for_each`.
- Consultar instancias mediante claves.
- Filtrar recursos mediante expresiones `for`.
- Utilizar condiciones para recursos opcionales.
- Distinguir identidad lógica y nombre remoto.
- Detectar reemplazos causados por cambios de índices.
- Migrar direcciones mediante bloques `moved`.
- Destruir el laboratorio de forma controlada.

### 1.2. Resultado práctico

Crearás buckets, manifiestos y un aviso opcional en S3 emulado.

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
```

El laboratorio utiliza Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se mantiene en la serie 5.x como restricción didáctica.

### 2.2. Conocimientos recomendados

Debes reconocer variables, locales, recursos, mapas, listas y outputs.

Los comandos presuponen una terminal compatible con Bash.

Terraform y AWS CLI se ejecutan en el host.

---

## 3. Compatibilidad del entorno

El docente debe validar la combinación concreta antes de distribuir la práctica.

### 3.1. Comprobaciones necesarias

Verifica:

- Creación de buckets S3.
- Escritura de objetos.
- Lectura de objetos.
- Consulta de etiquetas.
- Actualización de contenido.
- Eliminación de recursos.
- Aplicación de bloques `moved`.

### 3.2. Registro de versiones

Conserva la versión de Terraform y `.terraform.lock.hcl`.

Registra también la imagen o digest de LocalStack.

### 3.3. Alcance

Las restricciones indicadas no pretenden identificar las versiones más recientes.

El laboratorio utiliza únicamente operaciones básicas de S3.

---

## 4. Conceptos principales

Los tres mecanismos resuelven problemas relacionados, pero diferentes.

### 4.1. Comparación inicial

| **Mecanismo** | **Responsabilidad** | **Identidad resultante** |
|---------------|---------------------|--------------------------|
| `count` | Crear una cantidad de instancias | Índice numérico |
| `for_each` | Crear instancias por elementos identificables | Clave |
| Condicional | Seleccionar un valor o colección | No crea identidad por sí solo |
| Expresión `for` | Transformar o filtrar valores | Produce una colección |

La identidad importa cuando cambias la configuración.

### 4.2. Pregunta de diseño

¿Tus instancias son intercambiables o representan elementos con nombre propio?

### 4.3. Regla orientativa

Utiliza `count` para cantidades u opcionalidad sencilla.

Utiliza `for_each` cuando necesites claves estables.

---

## 5. Instancias y direcciones

Un bloque puede representar varias instancias gestionadas.

### 5.1. Sin repetición

```text
aws_s3_bucket.example
```

### 5.2. Con `count`

```text
aws_s3_bucket.example[0]
aws_s3_bucket.example[1]
```

### 5.3. Con `for_each`

```text
aws_s3_bucket.example["docs"]
aws_s3_bucket.example["reports"]
```

### 5.4. Consecuencia

Añadir un metaargumento de repetición cambia la forma de las direcciones.

No es únicamente una mejora estética del código.

El estado utiliza estas direcciones para relacionar instancias y objetos remotos.

---

## 6. Funcionamiento de `count`

`count` define cuántas instancias debe gestionar un bloque.

### 6.1. Ejemplo conceptual

```hcl
resource "aws_s3_bucket" "example" {
  count = 2

  bucket = "ejemplo-count-${count.index}"
}
```

No añadas este fragmento al laboratorio.

### 6.2. Índices

`count.index` empieza en cero.

Con dos instancias existen los índices cero y uno.

### 6.3. Restricciones

El valor debe ser un entero no negativo conocido durante el plan.

### 6.4. Uso habitual

Puede depender de una variable o de la longitud de una colección conocida.

---

## 7. Consultar recursos con `count`

Las referencias necesitan identificar la instancia.

### 7.1. Primera instancia

```hcl
aws_s3_bucket.example[0].bucket
```

### 7.2. Todas las instancias

```hcl
aws_s3_bucket.example[*].bucket
```

### 7.3. Expresión alternativa

```hcl
[
  for bucket in aws_s3_bucket.example :
  bucket.bucket
]
```

### 7.4. Precaución

La instancia cero no existe si `count` vale cero.

Una referencia incondicional a ella puede producir un error.

Diseña las salidas y los consumidores para contemplar esa ausencia.

---

## 8. `count` y listas de nombres

Puedes calcular la cantidad a partir de una lista.

### 8.1. Ejemplo conceptual

```hcl
resource "aws_s3_bucket" "example" {
  count = length(var.names)

  bucket = "ejemplo-${var.names[count.index]}"
}
```

### 8.2. Relación

La dirección utiliza la posición.

El nombre remoto utiliza el valor de esa posición.

### 8.3. Riesgo

Cambiar el orden puede asignar otro nombre a una dirección existente.

### 8.4. Idea esencial

Terraform no interpreta automáticamente el contenido de la lista como identidad estable.

Con `count`, la identidad sigue siendo el índice.

---

## 9. Problemas al eliminar elementos intermedios

Una lista puede desplazar valores cuando se modifica.

### 9.1. Lista inicial

```hcl
["alpha", "beta", "gamma"]
```

### 9.2. Lista modificada

```hcl
["alpha", "gamma"]
```

### 9.3. Consecuencia

La instancia uno pasa de representar `beta` a representar `gamma`.

La instancia dos desaparece.

### 9.4. Riesgo operativo

Si el nombre remoto obliga a reemplazar, puedes obtener más acciones de las esperadas.

### 9.5. Recomendación

Para elementos con identidad propia, considera `for_each`.

---

## 10. Funcionamiento de `for_each`

`for_each` crea instancias identificadas mediante claves.

### 10.1. Ejemplo conceptual

```hcl
resource "aws_s3_bucket" "example" {
  for_each = {
    docs    = {}
    reports = {}
  }

  bucket = "ejemplo-${each.key}"
}
```

### 10.2. Valores disponibles

`each.key` contiene la clave de la instancia.

`each.value` contiene su valor asociado.

### 10.3. Ventaja

Cambiar el orden visual del mapa no cambia la identidad.

Eliminar `reports` no desplaza la instancia `docs`.

---

## 11. Mapas y conjuntos para `for_each`

Los recursos aceptan mapas o conjuntos de cadenas.

### 11.1. Mapa

```hcl
{
  docs    = { purpose = "documentation" }
  reports = { purpose = "reporting" }
}
```

### 11.2. Conjunto

```hcl
toset(["docs", "reports"])
```

### 11.3. Diferencia

En un mapa, clave y valor pueden tener significados distintos.

En un conjunto de cadenas, `each.key` y `each.value` son iguales.

### 11.4. Restricción

Una lista no se convierte automáticamente en conjunto dentro de `for_each`.

Utiliza `toset` cuando esa transformación sea apropiada.

---

## 12. Claves estables

Las claves deben representar identidad lógica, no información accidental.

### 12.1. Buenos ejemplos

```text
docs
reports
archive
```

### 12.2. Ejemplos problemáticos

- Fecha actual.
- UUID calculado en cada ejecución.
- Identificador remoto desconocido durante el plan.
- Nombre que cambia por una decisión cosmética.

### 12.3. Sensibilidad

No utilices valores sensibles como argumento de `for_each`.

Las claves aparecen en direcciones, planes y mensajes.

### 12.4. Recomendación

Separa claves públicas de datos privados.

---

## 13. Consultar recursos con `for_each`

Las referencias utilizan claves, no índices.

### 13.1. Instancia concreta

```hcl
aws_s3_bucket.example["docs"].bucket
```

### 13.2. Mapa de resultados

```hcl
{
  for key, bucket in aws_s3_bucket.example :
  key => bucket.bucket
}
```

### 13.3. Lista ordenada de claves

```hcl
sort(keys(aws_s3_bucket.example))
```

### 13.4. Precaución

Una clave ausente no tiene una instancia disponible.

No accedas incondicionalmente a claves que un filtro puede eliminar.

---

## 14. Expresiones condicionales

Una condición selecciona uno de dos resultados.

### 14.1. Sintaxis

```hcl
condicion ? resultado_true : resultado_false
```

### 14.2. Ejemplo

```hcl
var.environment == "prod" ? "alta" : "normal"
```

### 14.3. Tipos

Las ramas deben permitir un resultado de tipo compatible.

Terraform puede aplicar conversiones.

### 14.4. Legibilidad

Evita mezclar números y textos sin necesidad.

Para expresiones largas, utiliza locales con nombres claros.

Una condición no equivale a un bloque imperativo `if`.

---

## 15. Recursos opcionales con `count`

La combinación habitual utiliza cero o una instancia.

### 15.1. Ejemplo conceptual

```hcl
resource "aws_s3_object" "notice" {
  count = var.enable_notice ? 1 : 0

  bucket  = var.bucket_name
  key     = "NOTICE.txt"
  content = "Aviso de laboratorio."
}
```

### 15.2. Comportamiento

`true` declara una instancia.

`false` declara ninguna.

### 15.3. Advertencia

Si la instancia ya existe, cambiar a `false` planifica su destrucción.

No significa suspenderla ni ocultarla.

---

## 16. Filtrar mapas para `for_each`

Una expresión `for` permite conservar elementos habilitados.

### 16.1. Ejemplo

```hcl
locals {
  active_workloads = {
    for key, config in var.workloads :
    key => config
    if config.enabled
  }
}
```

### 16.2. Uso

```hcl
for_each = local.active_workloads
```

### 16.3. Consecuencia

Una clave eliminada del mapa activo deja de tener una instancia declarada.

### 16.4. Regla

La opción `enabled` debe documentar el efecto de eliminar recursos existentes.

---

## 17. Opcionalidad y referencias seguras

Los consumidores deben contemplar que un recurso no exista.

### 17.1. Colección completa

```hcl
aws_s3_object.notice[*].key
```

Produce una colección vacía o una colección con un elemento.

### 17.2. Valor opcional

```hcl
one(aws_s3_object.notice[*].key)
```

Devuelve el único elemento o `null` si no hay ninguno.

### 17.3. Límite

`one` falla si la colección tiene más de un elemento.

### 17.4. Diseño

Para automatización, una lista vacía suele ser una interfaz fácil de procesar.

---

## 18. Restricciones compartidas

`count` y `for_each` son metaargumentos, no argumentos propios de S3.

### 18.1. Exclusión

No puedes utilizar ambos en el mismo bloque.

### 18.2. Conocimiento previo

Terraform necesita conocer la cantidad de `count`.

También necesita conocer las claves de `for_each`.

### 18.3. Valores desconocidos

No derives esas identidades de resultados remotos pendientes.

### 18.4. Paralelismo

Estos mecanismos no establecen una ejecución secuencial.

Las referencias entre recursos siguen determinando dependencias.

---

## 19. Preparación del laboratorio

Crearemos un proyecto independiente.

### 19.1. Directorios

```bash
mkdir -p terraform-repeticion-localstack/planes
mkdir -p terraform-repeticion-localstack/descargas
cd terraform-repeticion-localstack
```

### 19.2. Organización

```text
terraform-repeticion-localstack/
├── compose.yaml
├── .env
├── versions.tf
├── providers.tf
├── variables.tf
├── terraform.tfvars
├── locals.tf
├── main.tf
└── outputs.tf
```

---

## 20. Protección de archivos

Los artefactos no deben confundirse con documentación pública.

### 20.1. `.gitignore`

```gitignore
.terraform/
*.tfstate
*.tfstate.*
*.tfplan
.env
planes/
descargas/
crash.log
```

### 20.2. Qué conservar

Versiona configuración y `.terraform.lock.hcl` del proyecto raíz.

### 20.3. Precaución

Los planes y sus exportaciones JSON pueden contener datos sensibles.

No publiques el estado para demostrar que completaste la práctica.

---

## 21. Imagen y Docker Compose

Utiliza una imagen validada por el docente.

### 21.1. Selección

Sustituye el marcador:

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 21.2. `compose.yaml`

```yaml
services:
  localstack:
    image: ${LOCALSTACK_IMAGE:?Define LOCALSTACK_IMAGE}
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: s3
      AWS_DEFAULT_REGION: us-east-1
```

### 21.3. Arranque

Ejecuta `docker compose up -d` y comprueba el contenedor.

---

## 22. Credenciales y comprobación inicial

AWS CLI utilizará valores ficticios.

### 22.1. Terminal

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
```

### 22.2. Consulta

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3api list-buckets
```

### 22.3. Continuación

Espera una respuesta válida antes de desplegar.

Consulta los logs si LocalStack todavía no responde.

---

## 23. Requisitos y proveedor

Crea los archivos de conexión.

### 23.1. `versions.tf`

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

### 23.2. `providers.tf`

```hcl
provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
  s3_use_path_style            = true

  endpoints {
    s3 = "http://localhost:4566"
  }
}
```

---

## 24. Variables de identidad y cantidad

Crea `variables.tf`.

### 24.1. Declaraciones

```hcl
variable "suffix" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.suffix))
    error_message = "Usa entre 4 y 8 caracteres alfanuméricos."
  }
}

variable "count_names" {
  type     = list(string)
  default  = ["alpha", "beta"]
  nullable = false

  validation {
    condition = (
      length(distinct(var.count_names)) == length(var.count_names) &&
      alltrue([
        for name in var.count_names :
        can(regex("^[a-z][a-z0-9]{2,9}$", name))
      ])
    )
    error_message = "Utiliza nombres únicos de 3 a 10 caracteres."
  }
}
```

---

## 25. Variables de elementos y opcionalidad

Añade al mismo archivo.

### 25.1. Declaraciones

```hcl
variable "workloads" {
  type = map(object({
    enabled = optional(bool, true)
    purpose = string
  }))

  default = {
    docs    = { purpose = "documentation" }
    reports = { purpose = "reporting" }
  }

  nullable = false

  validation {
    condition = alltrue([
      for key in keys(var.workloads) :
      can(regex("^[a-z][a-z0-9]{2,11}$", key))
    ])
    error_message = "Utiliza claves de 3 a 12 caracteres válidos."
  }
}

variable "enable_notice" {
  type     = bool
  default  = true
  nullable = false
}
```

---

## 26. Entradas y valores locales

Crea los siguientes archivos.

### 26.1. `terraform.tfvars`

```hcl
suffix        = "alumno01"
count_names   = ["alpha", "beta"]
enable_notice = true

workloads = {
  docs    = { purpose = "documentation" }
  reports = { purpose = "reporting" }
}
```

### 26.2. `locals.tf`

```hcl
locals {
  prefix = "curso-repeticion-${var.suffix}"

  active_workloads = {
    for key, config in var.workloads :
    key => config
    if config.enabled
  }

  create_notice = (
    var.enable_notice &&
    contains(keys(local.active_workloads), "docs")
  )
}
```

---

## 27. Buckets con `count`

Crea `main.tf` con el primer grupo.

### 27.1. Configuración

```hcl
resource "aws_s3_bucket" "count_demo" {
  count = length(var.count_names)

  bucket = "${local.prefix}-count-${var.count_names[count.index]}"

  # Solo para facilitar la limpieza de datos ficticios.
  force_destroy = true

  tags = {
    Laboratory = "LocalStack"
    Method     = "count"
    LogicalName = var.count_names[count.index]
  }
}
```

### 27.2. Identidad

Las direcciones contienen índices.

Los nombres remotos contienen `alpha` y `beta`.

Esta diferencia permitirá observar el efecto de reordenar la lista.

---

## 28. Buckets con `for_each`

Añade el segundo grupo a `main.tf`.

### 28.1. Configuración

```hcl
resource "aws_s3_bucket" "workload" {
  for_each = local.active_workloads

  bucket = "${local.prefix}-each-${each.key}"

  force_destroy = true

  tags = {
    Laboratory = "LocalStack"
    Method     = "for_each"
    LogicalName = each.key
    Purpose     = each.value.purpose
  }
}
```

### 28.2. Identidad

Las direcciones utilizan `docs` y `reports`.

El orden visual del mapa no modifica esas claves.

### 28.3. Advertencia

La eliminación de una clave sí modifica las instancias declaradas.

---

## 29. Encadenamiento de `for_each`

Los objetos pueden utilizar el mapa de recursos creado previamente.

### 29.1. Añadir a `main.tf`

```hcl
resource "aws_s3_object" "manifest" {
  for_each = aws_s3_bucket.workload

  bucket       = each.value.id
  key          = "_lab/manifest.json"
  content_type = "application/json"

  content = jsonencode({
    logical_name = each.key
    bucket_name  = each.value.bucket
    purpose      = local.active_workloads[each.key].purpose
    environment  = "LocalStack"
  })
}
```

### 29.2. Dependencia

El objeto utiliza el bucket correspondiente.

Las claves del mapa conservan la relación entre instancias.

No necesitamos un `depends_on` redundante.

---

## 30. Objeto opcional con `count`

Añade el aviso al mismo archivo.

### 30.1. Configuración

```hcl
resource "aws_s3_object" "notice" {
  count = local.create_notice ? 1 : 0

  bucket       = aws_s3_bucket.workload["docs"].id
  key          = "NOTICE.txt"
  content_type = "text/plain"
  content      = "Aviso opcional del laboratorio."
}
```

### 30.2. Condición completa

El aviso requiere que esté habilitado y que exista la clave activa `docs`.

### 30.3. Ausencia

Si no se declara ninguna instancia, no hay un objeto aviso gestionado.

### 30.4. Precaución

Otros consumidores del bucket `docs` también deben contemplar su posible ausencia.

---

## 31. Outputs del laboratorio

Crea `outputs.tf`.

### 31.1. Resultados

```hcl
output "count_bucket_names" {
  value = aws_s3_bucket.count_demo[*].bucket
}

output "workload_bucket_names" {
  value = {
    for key, bucket in aws_s3_bucket.workload :
    key => bucket.bucket
  }
}

output "notice_keys" {
  value = aws_s3_object.notice[*].key
}

output "instance_summary" {
  value = {
    count_buckets = length(aws_s3_bucket.count_demo)
    each_buckets  = length(aws_s3_bucket.workload)
    manifests     = length(aws_s3_object.manifest)
    notices       = length(aws_s3_object.notice)
  }
}
```

---

## 32. Sesión 1: consola y predicción

Duración orientativa: 20 minutos.

### 32.1. Preparación

```bash
terraform init
terraform console
```

### 32.2. Consultas

```hcl
length(var.count_names)
var.count_names[0]
keys(local.active_workloads)
local.create_notice
toset(var.count_names)
```

### 32.3. Predicción

Antes de aplicar, calcula cuántos recursos deben crearse.

Con las entradas iniciales son siete.

### 32.4. Entregable

Registra dos buckets `count`, dos buckets `for_each`, dos manifiestos y un aviso.

---

## 33. Sesión 2: primer despliegue

Revisa la configuración antes de aplicar.

### 33.1. Secuencia

```bash
terraform fmt -recursive
terraform validate
terraform plan -out=planes/create.tfplan
terraform show planes/create.tfplan
terraform apply planes/create.tfplan
```

### 33.2. Comprobación

```bash
terraform output instance_summary
terraform state list
```

### 33.3. Observación

Identifica direcciones con índices y direcciones con claves.

### 33.4. Regla

Un plan guardado se aplica sin otra confirmación interactiva.

---

## 34. Sesión 3: verificar recursos en LocalStack

Consulta el bucket `docs` mediante AWS CLI.

### 34.1. Obtener nombre

```bash
DOCS_BUCKET="$(terraform output -json workload_bucket_names | jq -er '.docs')"
```

### 34.2. Listar objetos

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3api list-objects-v2 \
  --bucket "$DOCS_BUCKET"
```

### 34.3. Descargar manifiesto

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3 cp "s3://${DOCS_BUCKET}/_lab/manifest.json" descargas/manifest.json
```

### 34.4. Consulta

Ejecuta `jq '.' descargas/manifest.json` y revisa su clave lógica.

---

## 35. Sesión 4: desactivar el aviso

Esta práctica demuestra opcionalidad con destrucción.

### 35.1. Plan temporal

```bash
terraform plan \
  -var='enable_notice=false' \
  -out=planes/no-notice.tfplan
```

### 35.2. Resultado esperado

Debe eliminarse únicamente el aviso.

Los buckets y manifiestos deben conservarse.

### 35.3. Aplicación

```bash
terraform apply planes/no-notice.tfplan
terraform output notice_keys
```

### 35.4. Restauración

Un plan normal volverá a proponer el aviso porque el archivo mantiene `true`.

Revisa y aplica esa restauración antes de continuar.

---

## 36. Sesión 5: agregar un elemento con `count`

Añadir al final no desplaza los índices existentes.

### 36.1. Plan

```bash
terraform plan \
  -var='count_names=["alpha","beta","gamma"]'
```

### 36.2. Resultado esperado

Debe añadirse la instancia dos.

Las instancias cero y uno conservan sus nombres.

### 36.3. No aplicar

Esta sesión puede realizarse solo mediante observación.

### 36.4. Entregable

Explica por qué añadir al final es diferente de insertar al principio.

La identidad sigue siendo posicional aunque el caso observado resulte sencillo.

---

## 37. Sesión 6: reordenar una lista

El objetivo es observar reemplazos no deseados.

### 37.1. Plan temporal

```bash
terraform plan \
  -var='count_names=["beta","alpha"]' \
  -out=planes/reorder.tfplan
```

### 37.2. Observación

La instancia cero recibe el nombre antes asociado a la instancia uno.

La instancia uno recibe el nombre anterior de la instancia cero.

### 37.3. Advertencia

El plan puede mostrar reemplazos y la aplicación podría encontrar conflictos de nombres.

No apliques este artefacto.

### 37.4. Lección

Una lista de entidades con nombre propio suele encajar mejor en `for_each`.

---

## 38. Sesión 7: eliminar el primer elemento

Esta práctica muestra el desplazamiento de identidad.

### 38.1. Plan

```bash
terraform plan -var='count_names=["beta"]'
```

### 38.2. Resultado esperado

La instancia cero cambia de `alpha` a `beta`.

La instancia uno desaparece.

### 38.3. Interpretación

No equivale simplemente a eliminar la instancia `alpha`.

### 38.4. Precaución

No apliques la prueba.

### 38.5. Entregable

Describe las direcciones afectadas y el riesgo de conflicto o pérdida de datos.

---

## 39. Sesión 8: ampliar un mapa

Una clave nueva no desplaza las existentes.

### 39.1. Archivo temporal

Crea `extra-workload.tfvars`:

```hcl
workloads = {
  docs    = { purpose = "documentation" }
  reports = { purpose = "reporting" }
  archive = { purpose = "archiving" }
}
```

### 39.2. Plan

```bash
terraform plan -var-file=extra-workload.tfvars
```

### 39.3. Resultado esperado

Se añaden un bucket y un manifiesto para `archive`.

Los recursos `docs` y `reports` conservan sus direcciones.

---

## 40. Sesión 9: filtrar un elemento existente

Deshabilitar elimina la clave del mapa activo.

### 40.1. Archivo temporal

Crea `disabled-workload.tfvars`:

```hcl
workloads = {
  docs    = { purpose = "documentation" }
  reports = { purpose = "reporting", enabled = false }
}
```

### 40.2. Plan

```bash
terraform plan -var-file=disabled-workload.tfvars
```

### 40.3. Resultado esperado

Se destruyen el bucket `reports` y su manifiesto.

`docs` no cambia de identidad.

No apliques si solo estás realizando el ejercicio de observación.

---

## 41. Sesión 10: actualizar valores sin cambiar claves

La identidad puede mantenerse aunque cambien atributos.

### 41.1. Cambio

Modifica `purpose` de `reports` a `"analytics"`.

Mantén la clave `reports`.

### 41.2. Plan esperado

Terraform debe actualizar etiquetas y contenido del manifiesto.

El nombre del bucket permanece igual.

### 41.3. Comparación

Cambiar la clave a `analytics` representa otra instancia.

### 41.4. Regla

Distingue entre editar propiedades y cambiar identidad.

Después del ejercicio, restaura el propósito original o aplica conscientemente el cambio.

---

## 42. Migración de `count` a `for_each`

Una refactorización requiere preservar la relación con los objetos existentes.

### 42.1. Preparación

Completa y verifica la configuración inicial.

No apliques los planes de reordenación.

Confirma que cero corresponde a `alpha` y uno a `beta`.

### 42.2. Reemplazar el bloque

```hcl
resource "aws_s3_bucket" "count_demo" {
  for_each = toset(var.count_names)

  bucket        = "${local.prefix}-count-${each.key}"
  force_destroy = true

  tags = {
    Laboratory = "LocalStack"
    Method = "count"
    LogicalName = each.key
  }
}
```

---

## 43. Bloques `moved` y actualización de outputs

Añade `migrations.tf` para conservar las identidades existentes.

### 43.1. Mapeo explícito

```hcl
moved {
  from = aws_s3_bucket.count_demo[0]
  to   = aws_s3_bucket.count_demo["alpha"]
}

moved {
  from = aws_s3_bucket.count_demo[1]
  to   = aws_s3_bucket.count_demo["beta"]
}
```

### 43.2. Cambiar la salida

Reemplaza el valor de `count_bucket_names` por:

```hcl
[
  for key in sort(keys(aws_s3_bucket.count_demo)) :
  aws_s3_bucket.count_demo[key].bucket
]
```

---

## 44. Verificación de la migración

La refactorización no debe reemplazar los buckets.

### 44.1. Comprobaciones

```bash
terraform fmt
terraform validate
terraform plan -out=planes/migrate.tfplan
terraform show planes/migrate.tfplan
```

### 44.2. Resultado esperado

El plan debe reconocer los movimientos de dirección.

No debería crear ni destruir buckets.

### 44.3. Aplicación

Aplica el plan y consulta `terraform state list`.

### 44.4. Advertencia

Los mapeos corresponden a este estado inicial concreto.

No copies índices sin comprobar qué objetos representan.

---

## 45. Errores frecuentes

Diagnostica la causa antes de modificar el estado.

### 45.1. Ambos metaargumentos

Utilizar `count` y `for_each` en el mismo bloque es inválido.

### 45.2. Índice incorrecto

`[0]` no sirve para acceder a un recurso identificado por la clave `docs`.

### 45.3. Colección incompatible

Una lista no se acepta directamente como `for_each` de un recurso.

### 45.4. Identidad desconocida

No construyas claves con ARN o identificadores pendientes de creación.

### 45.5. Falsa solución

Reducir `-parallelism` no corrige índices desplazados ni claves mal elegidas.

---

## 46. Limpieza del laboratorio

Mantén LocalStack disponible durante la destrucción.

### 46.1. Plan y revisión

```bash
terraform plan -destroy -out=planes/destroy.tfplan
terraform show planes/destroy.tfplan
```

### 46.2. Aplicación y consulta

```bash
terraform apply planes/destroy.tfplan
terraform state list
aws --endpoint-url=http://localhost:4566 --region us-east-1 s3api list-buckets
```

### 46.3. Finalizar

```bash
docker compose down
rm -f planes/*.tfplan extra-workload.tfvars disabled-workload.tfvars
```

Borrar el estado no sustituye destruir los recursos.

---

## 47. Diferencias respecto a AWS real

El sistema de identidades pertenece a Terraform; el comportamiento remoto pertenece al servicio.

### 47.1. Aspectos transferibles

Las direcciones, condiciones, filtros y bloques `moved` siguen siendo relevantes.

### 47.2. Aspectos que requieren revisión

Comprueba permisos, disponibilidad de nombres, costes y retención de datos.

LocalStack puede simplificar restricciones y comportamiento operativo.

### 47.3. Destrucción

`force_destroy = true` facilita limpiar datos ficticios.

En AWS real puede provocar pérdida de información.

### 47.4. Reemplazos

Un reemplazo puede causar interrupciones y conflictos.

No presupongas que crear antes de destruir siempre es viable.

---

## 48. Ejercicios y resumen

Consolida el diseño de identidad antes de avanzar.

### 48.1. Ejercicios

1. Añade un almacenamiento con clave estable.
2. Publica sus resultados en un mapa.
3. Deshabilítalo y describe el plan.
4. Observa un desplazamiento de índices sin aplicarlo.
5. Documenta la migración entre índices y claves.
6. Explica por qué una opción deshabilitada puede destruir recursos.

### 48.2. Ideas esenciales

`count` identifica por posición.

`for_each` identifica por clave.

Las condiciones seleccionan valores o elementos declarados.

### 48.3. Idea final

Elige la identidad que debe mantenerse cuando cambie tu configuración, no únicamente la sintaxis que resulte más corta.