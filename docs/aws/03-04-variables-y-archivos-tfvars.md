# Variables y archivos tfvars en Terraform

Las variables permiten reutilizar una configuración sin modificar directamente sus recursos.

Los archivos `tfvars` proporcionan valores para esas variables.

La combinación de ambos mecanismos ayuda a separar la estructura de la infraestructura de las decisiones de cada despliegue.

En esta lección aprenderás a declarar entradas, proporcionar valores y comprobar qué configuración utiliza Terraform realmente.

Las prácticas utilizan el proveedor AWS con S3 emulado en LocalStack.

Todos los nombres, etiquetas y datos del laboratorio son ficticios.

> **Curso de Terraform para AWS.**
>
> Los ejemplos se ejecutan localmente con LocalStack.
>
> No necesitas una cuenta de AWS.
>
> No utilices credenciales reales en estas prácticas.

---

## 1. Objetivos de aprendizaje

Esta lección combina conceptos, ejercicios de consola y despliegues controlados.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Declarar variables de entrada.
- Diferenciar declaración y asignación.
- Definir tipos y valores predeterminados.
- Utilizar archivos `tfvars`.
- Reconocer archivos cargados automáticamente.
- Aplicar archivos con `-var-file`.
- Proporcionar valores con `-var`.
- Utilizar variables de entorno `TF_VAR_`.
- Explicar la precedencia de valores.
- Validar entradas.
- Interpretar errores de configuración.
- Separar valores de distintos entornos.

### 1.2. Resultado práctico

Crearás un bucket S3 y un objeto de texto.

Sus nombres, etiquetas y contenido dependerán de variables.

Después probarás distintas fuentes de valores.

---

## 2. Requisitos previos

Debes disponer de las herramientas del curso y conocer los bloques básicos de Terraform.

### 2.1. Herramientas

Comprueba:

```bash
terraform version
docker version
docker compose version
aws --version
```

El laboratorio utiliza Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se mantiene en la serie 5.x por compatibilidad didáctica.

La imagen de LocalStack debe estar validada por el docente.

### 2.2. Conocimientos recomendados

Deberías reconocer:

- Bloques `variable`.
- Referencias `var.nombre`.
- Valores locales.
- Recursos.
- Salidas.
- Tipos básicos.

No necesitas administrar una cuenta real de AWS.

---

## 3. Por qué utilizar variables

Una configuración con valores escritos directamente en cada recurso resulta difícil de adaptar.

### 3.1. Configuración rígida

```hcl
resource "aws_s3_bucket" "example" {
  bucket = "curso-dev-alumno01"

  tags = {
    Environment = "dev"
    Owner       = "formacion"
  }
}
```

Para cambiar de entorno debes editar el recurso.

Si existen muchos recursos, puedes introducir inconsistencias.

### 3.2. Configuración parametrizada

```hcl
resource "aws_s3_bucket" "example" {
  bucket = local.bucket_name

  tags = {
    Environment = var.environment
    Owner       = var.owner
  }
}
```

Ahora los recursos expresan una estructura reutilizable.

Los valores se proporcionan por separado.

---

## 4. Declaración y asignación

Declarar una variable no significa proporcionar su valor final.

### 4.1. Declaración

La declaración aparece en un archivo `.tf`:

```hcl
variable "environment" {
  description = "Entorno lógico del laboratorio."
  type        = string
  default     = "dev"
}
```

Define un contrato de entrada.

### 4.2. Asignación

La asignación aparece, por ejemplo, en un archivo `.tfvars`:

```hcl
environment = "test"
```

No contiene otro bloque `variable`.

### 4.3. Regla práctica

- `.tf`: define configuración y variables.
- `.tfvars`: asigna valores a variables del módulo raíz.

Confundir ambos formatos produce errores.

---

## 5. El archivo `variables.tf`

El nombre es una convención organizativa.

### 5.1. No tiene comportamiento especial

Terraform carga las declaraciones de todos los archivos `.tf` del directorio.

Podrías declarar variables en `main.tf`.

Utilizamos `variables.tf` para encontrarlas fácilmente.

### 5.2. Ejemplo

```hcl
variable "owner" {
  description = "Responsable ficticio del laboratorio."
  type        = string
  default     = "formacion"
}
```

### 5.3. Unicidad

No declares dos veces la misma variable en el mismo módulo.

Terraform combina los archivos, pero no interpreta declaraciones duplicadas como sobrescrituras.

### 5.4. Recomendación

Agrupa las entradas por responsabilidad.

Documenta su propósito.

Utiliza nombres comprensibles.

---

## 6. Tipos de variables

Los tipos establecen qué estructura espera la configuración.

### 6.1. Ejemplos

```hcl
variable "project" {
  type = string
}

variable "enabled" {
  type = bool
}

variable "copies" {
  type = number
}

variable "tags" {
  type = map(string)
}
```

### 6.2. Beneficio

Una restricción de tipo permite detectar entradas incompatibles antes de crear recursos.

### 6.3. Precaución

Terraform admite determinadas conversiones automáticas.

Un valor aceptado no siempre refleja la intención correcta.

Revisa especialmente números escritos como texto y colecciones mezcladas.

---

## 7. Valores predeterminados

`default` proporciona un valor cuando no existe otra asignación.

### 7.1. Variable opcional

```hcl
variable "environment" {
  type    = string
  default = "dev"
}
```

El usuario no necesita proporcionar esta entrada.

### 7.2. Variable requerida

```hcl
variable "project" {
  type = string
}
```

Sin un valor externo, Terraform puede solicitarlo interactivamente.

En automatización conviene utilizar `-input=false`.

### 7.3. Limitación

Un valor predeterminado no puede calcularse mediante otras variables:

```hcl
# Incorrecto:
# default = "${var.project}-dev"
```

Utiliza un valor local para ese cálculo.

---

## 8. Descripciones útiles

Una descripción debe explicar cómo utilizar una entrada.

### 8.1. Descripción poco útil

```hcl
description = "Variable de entorno."
```

No explica qué valores acepta ni qué modifica.

### 8.2. Descripción mejorada

```hcl
description = "Entorno lógico: dev, test o prod. Forma parte del nombre del bucket."
```

### 8.3. Información recomendable

Incluye:

- Propósito.
- Valores admitidos.
- Unidad, si procede.
- Consecuencias importantes.
- Restricciones conocidas.

### 8.4. Documentación complementaria

La descripción no sustituye los ejemplos.

Los archivos `tfvars.example` ayudan a mostrar entradas completas.

---

## 9. Validación de entradas

Las validaciones expresan reglas adicionales al tipo.

### 9.1. Ejemplo

```hcl
variable "environment" {
  type    = string
  default = "dev"

  validation {
    condition = contains(
      ["dev", "test", "prod"],
      var.environment
    )

    error_message = "Utiliza dev, test o prod."
  }
}
```

### 9.2. Función

La condición debe producir un booleano.

Cuando no se cumple, Terraform rechaza la entrada.

### 9.3. Alcance

Estas reglas no comprueban todos los requisitos remotos.

Un nombre válido para el laboratorio todavía puede no estar disponible en AWS real.

---

## 10. Nulabilidad

`null` representa ausencia de valor.

### 10.1. Variable no nula

```hcl
variable "project" {
  type     = string
  nullable = false
}
```

No acepta un valor nulo como entrada final.

### 10.2. Con valor predeterminado

Si una variable no nula tiene `default`, un `null` explícito puede hacer que se utilice ese valor predeterminado.

Diseña este comportamiento conscientemente.

### 10.3. Estructuras anidadas

`nullable = false` afecta a la variable completa.

No prohíbe automáticamente todos los valores nulos dentro de objetos o mapas.

### 10.4. Recomendación

Documenta si la ausencia de un valor tiene significado.

No utilices `null` para esconder una entrada incorrecta.

---

## 11. Variables sensibles

`sensitive` marca valores que no deberían aparecer en determinadas salidas habituales.

### 11.1. Ejemplo conceptual

```hcl
variable "example_token" {
  type      = string
  sensitive = true
}
```

### 11.2. Qué no garantiza

No garantiza:

- Cifrado del archivo `tfvars`.
- Eliminación del valor del estado.
- Ausencia del valor en un plan guardado.
- Protección de un archivo publicado como recurso.

### 11.3. Laboratorio

No utilizaremos secretos reales.

Una credencial ficticia tampoco debe confundirse con una estrategia de gestión de secretos.

### 11.4. Regla esencial

La protección requiere controles sobre archivos, estado, planes, herramientas y permisos.

---

## 12. Fuentes de valores

Terraform CLI puede recibir entradas desde varias fuentes.

### 12.1. Vista general

| **Fuente** | **Ejemplo** | **Carga** |
|------------|-------------|-----------|
| Predeterminado | `default = "dev"` | Si no hay otra asignación |
| Entorno | `TF_VAR_environment=test` | Desde el proceso |
| Archivo convencional | `terraform.tfvars` | Automática |
| Archivo automático | `equipo.auto.tfvars` | Automática |
| Archivo explícito | `-var-file=env/dev.tfvars` | Por argumento |
| Argumento directo | `-var=environment=test` | Por argumento |

Estas reglas describen las prácticas locales con Terraform CLI.

Las plataformas de ejecución remota pueden incorporar mecanismos adicionales.

### 12.2. Punto importante

No todas las fuentes tienen la misma prioridad.

La existencia de un valor en un archivo no demuestra que sea el valor efectivo.

---

## 13. Precedencia en Terraform CLI

Las fuentes posteriores en esta lista prevalecen sobre las anteriores.

### 13.1. Orden

1. Valor `default`.
2. Variables de entorno `TF_VAR_`.
3. `terraform.tfvars`.
4. `terraform.tfvars.json`.
5. Archivos `*.auto.tfvars` y `*.auto.tfvars.json`.
6. Opciones `-var` y `-var-file`.

Los archivos automáticos se procesan por orden lexicográfico de nombre.

Las opciones explícitas se procesan en el orden proporcionado.

### 13.2. Ejemplo

```bash
terraform plan \
  -var-file=env/dev.tfvars \
  -var='environment=test'
```

El entorno efectivo será `test`.

### 13.3. Invertir opciones

Si colocas primero `-var` y después un archivo que define esa variable, prevalece el archivo.

---

## 14. Sobrescritura no significa combinación

La precedencia se aplica al valor completo de una variable.

### 14.1. Primer archivo

```hcl
extra_tags = {
  Owner = "equipo-a"
  Group = "grupo-a"
}
```

### 14.2. Segundo archivo

```hcl
extra_tags = {
  CostCenter = "laboratorio"
}
```

### 14.3. Resultado

Si el segundo prevalece, el mapa no conserva automáticamente `Owner` ni `Group`.

El valor completo de `extra_tags` se sustituye.

### 14.4. Combinación deliberada

Para combinar mapas, utiliza variables separadas y una expresión:

```hcl
merge(var.base_tags, var.extra_tags)
```

No presupongas una fusión profunda entre archivos.

---

## 15. Archivos `terraform.tfvars`

Este nombre activa la carga automática en el módulo raíz.

### 15.1. Ejemplo

```hcl
project     = "curso-vars"
environment = "dev"
owner       = "formacion"
```

### 15.2. Ubicación

Debe estar en el directorio de trabajo del módulo raíz.

Terraform no busca automáticamente archivos con ese nombre en todos los subdirectorios.

### 15.3. Riesgo

Un archivo olvidado puede modificar un despliegue.

Revisa su existencia antes de ejecutar planes de otros entornos.

### 15.4. Laboratorio

No crearemos inicialmente este archivo.

Utilizaremos archivos explícitos para observar mejor la selección.

---

## 16. Archivos `auto.tfvars`

Estos archivos también se cargan automáticamente.

### 16.1. Ejemplos

```text
10-equipo.auto.tfvars
20-laboratorio.auto.tfvars
```

### 16.2. Orden

El segundo nombre se procesa después del primero.

Una variable definida en ambos recibe el valor posterior.

### 16.3. Buena práctica

Utiliza nombres y contenido que hagan evidente su propósito.

No repartas arbitrariamente la misma variable entre muchos archivos automáticos.

### 16.4. Precaución

Los números del nombre ayudan a expresar un orden lexicográfico.

No crean dependencias entre recursos.

---

## 17. Archivos explícitos

Un archivo como `dev.tfvars` no se carga solo.

### 17.1. Aplicación

```bash
terraform plan -var-file=env/dev.tfvars
```

### 17.2. Ventaja

La selección aparece en el comando.

Esto facilita revisión y documentación.

### 17.3. Limitación

Terraform también sigue cargando los archivos automáticos del directorio raíz.

El archivo explícito no desactiva esas fuentes.

### 17.4. Recomendación

Utiliza archivos explícitos completos para las decisiones relevantes de cada entorno.

Mantén visibles las fuentes comunes.

Evita depender de un archivo automático desconocido.

---

## 18. Formato JSON

Terraform permite asignar variables utilizando JSON.

### 18.1. Ejemplo

```json
{
  "project": "curso-vars",
  "environment": "dev",
  "owner": "formacion"
}
```

### 18.2. Nombre explícito

```text
env/dev.tfvars.json
```

### 18.3. Uso

```bash
terraform plan -var-file=env/dev.tfvars.json
```

### 18.4. Diferencias

JSON exige:

- Comillas en las claves.
- Comas entre propiedades.
- Ausencia de comentarios.
- Sintaxis JSON válida.

Un archivo JSON de variables no es un archivo `.tf.json` de configuración.

---

## 19. Expresiones dentro de `tfvars`

Un archivo de valores no dispone del contexto de referencias del módulo.

### 19.1. Correcto

```hcl
environment = "dev"

extra_tags = {
  Group = "grupo-a"
}
```

### 19.2. Incorrecto

```hcl
# No utilizar:
# owner = var.project
# extra_tags = local.common_tags
```

### 19.3. Funciones

Las llamadas a funciones tampoco están disponibles como en una configuración `.tf`.

No calcules nombres mediante `lower` o `format` dentro del archivo de valores.

### 19.4. Separación

- `tfvars`: datos de entrada.
- `.tf`: referencias, funciones y cálculos.

Esta separación facilita comprender responsabilidades.

---

## 20. Variables de entorno `TF_VAR_`

El prefijo permite pasar entradas desde el proceso.

### 20.1. Ejemplo

```bash
export TF_VAR_environment=test
terraform plan
```

### 20.2. Nombre exacto

Para `variable "owner"`, utiliza:

```bash
export TF_VAR_owner=formacion
```

### 20.3. Tipos complejos

```bash
export TF_VAR_extra_tags='{"Group":"grupo-a"}'
```

Las comillas protegen el contenido frente al intérprete de comandos.

### 20.4. Limpieza

```bash
unset TF_VAR_environment TF_VAR_owner TF_VAR_extra_tags
```

Estas variables pueden permanecer activas durante toda la sesión de terminal.

Registra cuándo las utilizas.

---

## 21. Entradas con `-var`

Esta opción permite proporcionar un valor directamente.

### 21.1. Cadena

```bash
terraform plan -var='environment=test'
```

### 21.2. Booleano

```bash
terraform plan -var='allow_bucket_cleanup=true'
```

### 21.3. Mapa

```bash
terraform plan \
  -var='extra_tags={Group="grupo-b",Owner="docente"}'
```

### 21.4. Riesgo operativo

El comando puede quedar guardado en el historial.

No introduzcas secretos reales como argumentos.

### 21.5. Recomendación

Utiliza `-var` para pruebas puntuales.

Para configuraciones completas y revisables, suelen resultar más claros los archivos explícitos.

---

## 22. Preparación del laboratorio

Crearemos un proyecto dedicado a esta lección.

### 22.1. Directorios

```bash
mkdir -p terraform-variables-localstack/env
cd terraform-variables-localstack
```

### 22.2. Estructura

```text
terraform-variables-localstack/
├── compose.yaml
├── .env
├── .gitignore
├── versions.tf
├── providers.tf
├── variables.tf
├── locals.tf
├── main.tf
├── outputs.tf
└── env/
    ├── dev.tfvars
    ├── test.tfvars
    └── dev.tfvars.json
```

### 22.3. Criterio

No crees aún archivos automáticos.

Las sesiones posteriores los añadirán temporalmente.

---

## 23. Imagen y arranque de LocalStack

El docente debe proporcionar una imagen validada para el laboratorio.

### 23.1. Selección

Sustituye el marcador:

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

No ejecutes el arranque manteniendo el marcador.

### 23.2. `compose.yaml`

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

### 23.3. Arranque

```bash
docker compose up -d
docker compose ps
```

El laboratorio utiliza Terraform ejecutado en el host.

---

## 24. Credenciales y conectividad

Configura AWS CLI con valores ficticios.

### 24.1. Terminal

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
```

### 24.2. Consulta

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3api list-buckets
```

### 24.3. Si falla

Consulta:

```bash
docker compose logs --tail=100 localstack
```

### 24.4. Continuación

Espera hasta recibir una respuesta válida.

No confundas un error de conectividad con un error de variables.

---

## 25. Requisitos y proveedor

Crea los archivos de conexión.

### 25.1. `versions.tf`

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

### 25.2. `providers.tf`

```hcl
provider "aws" {
  region     = "us-east-1"
  access_key = "test"
  secret_key = "test"

  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  s3_use_path_style = true

  endpoints {
    s3 = "http://localhost:4566"
  }
}
```

Solo S3 está redirigido mediante esta configuración.

---

## 26. Variables principales del laboratorio

Crea `variables.tf`.

### 26.1. Nombres

```hcl
variable "project" {
  description = "Prefijo del laboratorio."
  type        = string
  nullable    = false

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,19}$", var.project))
    error_message = "Usa entre 3 y 20 caracteres válidos."
  }
}

variable "environment" {
  description = "Entorno lógico: dev, test o prod."
  type        = string
  default     = "dev"
  nullable    = false

  validation {
    condition     = contains(["dev", "test", "prod"], var.environment)
    error_message = "Utiliza dev, test o prod."
  }
}

variable "suffix" {
  description = "Identificador ficticio del alumno."
  type        = string
  nullable    = false

  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.suffix))
    error_message = "Usa entre 4 y 8 caracteres alfanuméricos."
  }
}
```

Estas restricciones representan convenciones didácticas.

---

## 27. Variables de contenido y etiquetas

Añade al mismo archivo:

### 27.1. Declaraciones

```hcl
variable "owner" {
  description = "Responsable ficticio."
  type        = string
  default     = "formacion"
  nullable    = false
}

variable "extra_tags" {
  description = "Etiquetas adicionales."
  type        = map(string)
  default     = {}
  nullable    = false
}

variable "document" {
  description = "Contenido del objeto de práctica."

  type = object({
    content      = string
    content_type = optional(string, "text/plain")
  })

  default = {
    content = "Laboratorio de variables y archivos tfvars."
  }

  nullable = false
}

variable "allow_bucket_cleanup" {
  description = "Permite eliminar objetos ficticios al destruir."
  type        = bool
  default     = false
  nullable    = false
}
```

La limpieza está desactivada por defecto.

Los archivos del laboratorio la habilitarán expresamente.

---

## 28. Valores del entorno de desarrollo

Crea `env/dev.tfvars`.

### 28.1. Archivo

```hcl
project     = "curso-vars"
environment = "dev"
suffix      = "alumno01"
owner       = "equipo-dev"

allow_bucket_cleanup = true

extra_tags = {
  Group   = "grupo-a"
  Session = "variables"
}

document = {
  content = "Documento de desarrollo ejecutado en LocalStack."
}
```

### 28.2. Atributo opcional

No hemos asignado `content_type`.

Terraform utilizará `text/plain`.

### 28.3. Fuente explícita

Este archivo no se carga automáticamente.

Debes seleccionarlo con `-var-file`.

---

## 29. Valores de prueba y versión JSON

Crea dos alternativas para practicar.

### 29.1. `env/test.tfvars`

```hcl
project     = "curso-vars"
environment = "test"
suffix      = "alumno01"
owner       = "equipo-test"

allow_bucket_cleanup = true

extra_tags = {
  Group   = "grupo-b"
  Session = "variables"
}

document = {
  content = "Documento de pruebas ejecutado en LocalStack."
}
```

### 29.2. `env/dev.tfvars.json`

```json
{
  "project": "curso-vars",
  "environment": "dev",
  "suffix": "alumno01",
  "owner": "equipo-dev",
  "allow_bucket_cleanup": true,
  "extra_tags": {
    "Group": "grupo-a",
    "Session": "variables"
  },
  "document": {
    "content": "Documento de desarrollo ejecutado en LocalStack."
  }
}
```

No selecciones ambos sin comprender su precedencia.

---

## 30. Cálculos y recursos

Crea `locals.tf` y `main.tf`.

### 30.1. `locals.tf`

```hcl
locals {
  bucket_name = "${var.project}-${var.environment}-${var.suffix}"

  tags = merge(var.extra_tags, {
    Project     = var.project
    Environment = var.environment
    Owner       = var.owner
    ManagedBy   = "Terraform"
    Laboratory  = "LocalStack"
  })
}
```

### 30.2. `main.tf`

```hcl
resource "aws_s3_bucket" "lab" {
  bucket        = local.bucket_name
  force_destroy = var.allow_bucket_cleanup
  tags          = local.tags
}

resource "aws_s3_object" "document" {
  bucket       = aws_s3_bucket.lab.id
  key          = "README.txt"
  content      = var.document.content
  content_type = var.document.content_type
}
```

La referencia al bucket establece la dependencia del objeto.

Las etiquetas base prevalecen sobre claves adicionales repetidas.

---

## 31. Salidas y control de archivos

Crea `outputs.tf` y `.gitignore`.

### 31.1. `outputs.tf`

```hcl
output "bucket_name" {
  value = aws_s3_bucket.lab.bucket
}

output "effective_inputs" {
  value = {
    environment = var.environment
    owner       = var.owner
    extra_tags  = var.extra_tags
    document    = var.document
  }
}

output "effective_tags" {
  value = local.tags
}
```

### 31.2. `.gitignore`

```gitignore
.terraform/
*.tfstate
*.tfstate.*
*.tfplan
.env
README-descargado.txt
```

### 31.3. Criterio

Los `tfvars` de esta práctica contienen datos ficticios y pueden versionarse.

En otros proyectos, revisa su contenido antes de hacerlo.

---

## 32. Sesión práctica: primera configuración

Duración orientativa: 25 minutos.

### 32.1. Preparación

```bash
terraform init
terraform fmt -recursive
terraform validate
```

`terraform validate` comprueba la configuración.

No sustituye la evaluación de entradas concretas mediante un plan.

### 32.2. Plan

```bash
terraform plan \
  -input=false \
  -var-file=env/dev.tfvars \
  -out=dev.tfplan
```

Deberían aparecer dos recursos nuevos.

### 32.3. Aplicación

```bash
terraform apply dev.tfplan
terraform output
```

El plan guardado ya contiene las entradas seleccionadas.

Su aplicación no solicita otra aprobación interactiva.

---

## 33. Sesión práctica: verificación del despliegue

Consulta el recurso con AWS CLI.

### 33.1. Nombre

```bash
BUCKET="$(terraform output -raw bucket_name)"
```

### 33.2. Etiquetas

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3api get-bucket-tagging \
  --bucket "$BUCKET"
```

### 33.3. Documento

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3 cp \
  "s3://${BUCKET}/README.txt" \
  ./README-descargado.txt
```

### 33.4. Comprobación

Lee el archivo y compara su contenido con `env/dev.tfvars`.

Registra qué variables afectaron al nombre, etiquetas y contenido.

---

## 34. Sesión práctica: comprobar precedencia

Utilizaremos la consola sin aplicar cambios.

### 34.1. Entorno frente a archivo

```bash
export TF_VAR_owner=desde-entorno
terraform console -var-file=env/dev.tfvars
```

Introduce:

```hcl
var.owner
```

El resultado será `equipo-dev`.

Escribe `exit`.

### 34.2. Argumento posterior

```bash
terraform console \
  -var-file=env/dev.tfvars \
  -var='owner=desde-cli'
```

Consulta nuevamente `var.owner`.

### 34.3. Orden inverso

```bash
terraform console \
  -var='owner=desde-cli' \
  -var-file=env/dev.tfvars
```

Ahora prevalece el archivo.

---

## 35. Sesión práctica: archivos automáticos

Crea archivos temporales exclusivamente para esta prueba.

### 35.1. Archivos

```bash
printf 'owner = "desde-convencional"\n' > terraform.tfvars
printf 'owner = "desde-auto-10"\n' > 10-owner.auto.tfvars
printf 'owner = "desde-auto-20"\n' > 20-owner.auto.tfvars
```

### 35.2. Proporcionar entradas requeridas

```bash
export TF_VAR_project=curso-vars
export TF_VAR_suffix=alumno01
terraform console
```

Consulta `var.owner`.

Debe prevalecer `desde-auto-20`.

### 35.3. Archivo explícito

Repite con `-var-file=env/dev.tfvars`.

Debe prevalecer `equipo-dev`.

### 35.4. Limpieza inmediata

```bash
rm -f terraform.tfvars 10-owner.auto.tfvars 20-owner.auto.tfvars
unset TF_VAR_project TF_VAR_suffix TF_VAR_owner
```

---

## 36. Sesión práctica: mapas reemplazados

Esta prueba muestra que los archivos no fusionan mapas automáticamente.

### 36.1. Archivo temporal

```bash
printf 'extra_tags = { CostCenter = "laboratorio" }\n' \
  > env/override.tfvars
```

### 36.2. Consola

```bash
terraform console \
  -var-file=env/dev.tfvars \
  -var-file=env/override.tfvars
```

### 36.3. Consulta

```hcl
var.extra_tags
```

Solo debe aparecer `CostCenter`.

Consulta también:

```hcl
local.tags
```

Las etiquetas base siguen apareciendo porque el código utiliza `merge`.

### 36.4. Limpieza

Sal de la consola y elimina `env/override.tfvars`.

---

## 37. Sesión práctica: JSON e igualdad

Compara dos representaciones de la misma entrada.

### 37.1. Plan JSON

```bash
terraform plan \
  -input=false \
  -var-file=env/dev.tfvars.json
```

Si no has aplicado otros cambios, no deberían aparecer diferencias inesperadas.

### 37.2. Consola

```bash
terraform console -var-file=env/dev.tfvars.json
```

### 37.3. Consultas

```hcl
var.document.content
var.document.content_type
var.extra_tags
```

### 37.4. Entregable

Explica por qué cambia el formato del archivo, pero no necesariamente la configuración efectiva.

Registra cualquier diferencia encontrada.

---

## 38. Sesión práctica: cambiar de entorno

Un archivo distinto no crea aislamiento de estado.

### 38.1. Plan de prueba

```bash
terraform plan \
  -input=false \
  -var-file=env/test.tfvars
```

### 38.2. Qué observar

El nombre calculado cambia de `dev` a `test`.

Terraform puede planificar el reemplazo del bucket gestionado en el mismo estado.

No está creando automáticamente un segundo entorno independiente.

### 38.3. No aplicar

Esta sesión es de observación.

Vuelve a seleccionar `env/dev.tfvars`.

### 38.4. Principio

- Los `tfvars` separan valores.
- Los estados separados identifican despliegues independientes.
- Las credenciales y permisos definen otros límites de aislamiento.

Son responsabilidades diferentes.

---

## 39. Planes guardados y valores efectivos

Un plan guardado conserva las decisiones de la planificación.

### 39.1. Flujo correcto

```bash
terraform plan \
  -var-file=env/dev.tfvars \
  -out=reviewed.tfplan

terraform show reviewed.tfplan
terraform apply reviewed.tfplan
```

### 39.2. Cambio posterior del archivo

Editar el archivo de variables después no modifica el plan existente.

Si necesitas nuevos valores, genera otro plan.

### 39.3. Aplicación

No añadas `-var-file` para intentar modificar un plan guardado durante su aplicación.

### 39.4. Seguridad

Un plan puede contener información sensible.

Protégelo y elimínalo cuando deje de ser necesario.

No lo publiques en el repositorio.

---

## 40. Variables del módulo raíz y módulos hijos

Los archivos `tfvars` asignan entradas al módulo raíz.

### 40.1. Llamada conceptual

```hcl
module "storage" {
  source = "./modules/storage"

  bucket_name = local.bucket_name
  owner       = var.owner
}
```

### 40.2. Módulo hijo

Debe declarar sus propias variables:

```hcl
variable "bucket_name" {
  type = string
}
```

### 40.3. No hay herencia de valores automática

Un archivo `terraform.tfvars` dentro del directorio del módulo hijo no se utiliza para asignarle valores cuando se llama desde el módulo raíz.

### 40.4. Regla

El módulo raíz recibe entradas externas.

El bloque `module` transmite las entradas al módulo hijo.

---

## 41. Diagnóstico de errores frecuentes

Clasifica el error antes de modificar la configuración.

### 41.1. Variable requerida ausente

Utiliza `-input=false` para detectar entradas que faltan sin abrir preguntas interactivas.

### 41.2. Nombre no declarado

Una asignación en un archivo de variables a un nombre inexistente produce una advertencia.

Una asignación explícita con `-var` a una variable no declarada produce un error.

### 41.3. Tipo incorrecto

```hcl
extra_tags = ["grupo-a"]
```

No cumple `map(string)`.

### 41.4. Valor inválido

```hcl
environment = "desarrollo"
```

No cumple la validación del laboratorio.

### 41.5. Referencias prohibidas

No utilices `var.*` ni `local.*` dentro de `tfvars`.

---

## 42. Buenas prácticas y diferencias con AWS real

La organización de entradas forma parte del control operativo.

### 42.1. Buenas prácticas

- Utiliza nombres explícitos.
- Documenta valores requeridos.
- Evita fuentes ocultas.
- Revisa mapas reemplazados.
- No introduzcas secretos en el historial.
- Versiona ejemplos sin datos sensibles.
- Mantén estados separados para despliegues independientes.

### 42.2. Backend y proveedor

Un archivo `tfvars` no configura automáticamente credenciales de AWS CLI.

Tampoco permite utilizar `var.*` dentro de un bloque de backend.

La configuración del backend se trata por separado durante la inicialización.

### 42.3. AWS real

Revisa permisos, costes, nombres disponibles y política de destrucción antes de trasladar el ejemplo.

Las opciones locales del proveedor no son una configuración de producción.

---

## 43. Limpieza del laboratorio

Destruye utilizando las entradas de la configuración que has aplicado.

### 43.1. Revisar

```bash
terraform plan \
  -destroy \
  -input=false \
  -var-file=env/dev.tfvars \
  -out=destroy.tfplan
```

### 43.2. Aplicar

```bash
terraform apply destroy.tfplan
```

### 43.3. Comprobar

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3api list-buckets
```

### 43.4. Finalizar

```bash
docker compose down
rm -f dev.tfplan reviewed.tfplan destroy.tfplan README-descargado.txt
```

Mantén LocalStack activo hasta terminar la destrucción.

---

## 44. Ejercicios y resumen

Consolida los conceptos antes de avanzar.

### 44.1. Ejercicios

1. Añade una variable `department`.
2. Inclúyela en las etiquetas base.
3. Asigna valores distintos en desarrollo y prueba.
4. Comprueba la precedencia con `TF_VAR_department`.
5. Genera un ejemplo JSON equivalente.
6. Explica por qué dos archivos no crean dos estados.
7. Documenta una entrada rechazada por validación.

### 44.2. Ideas esenciales

Las declaraciones definen contratos.

Los archivos `tfvars` proporcionan datos.

La precedencia determina qué asignación prevalece.

Los mapas no se combinan automáticamente entre fuentes.

Los planes guardados conservan sus entradas.

Las variables sensibles requieren controles adicionales.

### 44.3. Cierre

Una configuración reutilizable no depende únicamente de tener variables.

También necesita entradas claras, selección explícita, revisión del plan y una separación consciente entre valores, estado y credenciales.