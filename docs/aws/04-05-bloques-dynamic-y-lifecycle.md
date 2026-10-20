# Bloques `dynamic` y `lifecycle` en Terraform

Los bloques `dynamic` permiten generar bloques anidados a partir de colecciones.

El bloque `lifecycle` permite ajustar determinadas decisiones de planificación y aplicación.

Aunque ambos aparecen dentro de configuraciones de recursos, resuelven problemas diferentes.

`dynamic` reduce repetición en estructuras admitidas por el proveedor.

`lifecycle` expresa reglas sobre reemplazos, destrucciones, cambios ignorados y condiciones verificables.

En esta lección practicarás con buckets, objetos y configuración CORS de S3 emulado mediante LocalStack.

También aprenderás a distinguir el ciclo de vida de Terraform de las políticas de ciclo de vida del servicio S3.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página se ejecutan localmente con LocalStack.
>
> Utiliza credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.

---

## 1. Objetivos

Esta lección combina generación de configuración, revisión de planes y ejercicios de seguridad operativa.

### 1.1. Objetivos de aprendizaje

Al finalizar podrás:

- Generar bloques anidados mediante `dynamic`.
- Utilizar iteradores con nombres explícitos.
- Diferenciar bloques anidados y argumentos.
- Evitar estructuras dinámicas innecesarias.
- Aplicar `create_before_destroy`.
- Comprender los límites de `prevent_destroy`.
- Utilizar `ignore_changes` con un alcance concreto.
- Forzar reemplazos mediante `replace_triggered_by`.
- Añadir precondiciones y postcondiciones.
- Verificar resultados fuera de Terraform.

### 1.2. Resultado práctico

Crearás configuración CORS desde un mapa y experimentarás con reglas de ciclo de vida.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos de las lecciones anteriores.

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

El proveedor AWS se limita a la serie 5.x como base didáctica.

### 2.2. Conocimientos recomendados

Debes reconocer variables, locales, recursos, mapas, `for_each` y planes guardados.

Los comandos utilizan una terminal compatible con Bash.

---

## 3. Compatibilidad y reproducibilidad

La combinación concreta debe validarse antes de impartir la práctica.

### 3.1. Comprobaciones del docente

Verifica en la imagen y edición elegidas:

- Creación y eliminación de buckets.
- Escritura y lectura de objetos.
- Configuración y consulta de CORS.
- Consulta y modificación de etiquetas.
- Aplicación de planes guardados.
- Reemplazos de recursos.
- Comportamiento del proveedor ante cambios externos.

### 3.2. Registro de versiones

Conserva la versión de Terraform y `.terraform.lock.hcl`.

Documenta la imagen o digest de LocalStack.

### 3.3. Alcance

Las restricciones del curso no identifican necesariamente las versiones más recientes.

---

## 4. Dos mecanismos con responsabilidades distintas

Conviene separar generación de estructura y decisiones de ciclo de vida.

### 4.1. Comparación

| **Mecanismo** | **Responsabilidad** | **Resultado** |
|---------------|---------------------|---------------|
| `dynamic` | Generar bloques anidados | Configuración del recurso |
| `for_each` del recurso | Crear instancias | Direcciones en el estado |
| Expresión `for` | Transformar valores | Lista, mapa u otra colección |
| `lifecycle` | Ajustar reglas operativas | Comportamiento de planificación |

Estas herramientas pueden combinarse, pero no se sustituyen entre sí.

### 4.2. Pregunta orientativa

¿Necesitas generar configuración interna o gestionar varias instancias independientes?

### 4.3. Regla

Elige el mecanismo según la responsabilidad, no según cuál parezca más flexible.

---

## 5. Qué es un bloque anidado

Un bloque anidado forma parte de la configuración de otro bloque.

### 5.1. Ejemplo conceptual

```hcl
cors_rule {
  allowed_methods = ["GET"]
  allowed_origins = ["https://app.example.test"]
}
```

Este bloque pertenece a un recurso de configuración CORS.

### 5.2. Diferencia respecto a un recurso

No tiene automáticamente una dirección de recurso propia en el estado.

### 5.3. Esquema del proveedor

El proveedor determina qué bloques existen y qué argumentos admiten.

No puedes inventar un bloque porque resulte cómodo para organizar datos.

---

## 6. Argumentos y bloques

Los argumentos asignan valores; los bloques describen estructuras admitidas por el lenguaje o proveedor.

### 6.1. Argumento

```hcl
allowed_methods = ["GET", "HEAD"]
```

### 6.2. Bloque

```hcl
cors_rule {
  allowed_methods = ["GET", "HEAD"]
  allowed_origins = ["https://app.example.test"]
}
```

### 6.3. Consecuencia

Para calcular una lista, utiliza expresiones.

Para repetir bloques anidados, puedes utilizar `dynamic`.

### 6.4. Error habitual

No utilices `dynamic` para generar directamente cada elemento de un argumento de lista.

---

## 7. Sintaxis de `dynamic`

Un bloque dinámico describe cómo generar otros bloques.

### 7.1. Ejemplo

```hcl
dynamic "cors_rule" {
  for_each = var.cors_rules
  iterator = rule

  content {
    allowed_methods = rule.value.allowed_methods
    allowed_origins = rule.value.allowed_origins
  }
}
```

### 7.2. Componentes

La etiqueta identifica el bloque generado.

`for_each` proporciona la colección.

`content` describe el contenido de cada bloque.

---

## 8. El iterador

El iterador representa el elemento que se está transformando.

### 8.1. Nombre explícito

```hcl
iterator = rule
```

El nombre se escribe como identificador, no como cadena.

### 8.2. Atributos disponibles

`rule.key` contiene la clave o posición.

`rule.value` contiene el valor asociado.

### 8.3. Nombre predeterminado

Si omites `iterator`, Terraform utiliza el nombre del bloque dinámico.

### 8.4. Recomendación

Usa nombres explícitos cuando mejoren la lectura, especialmente con varios niveles anidados.

---

## 9. Colecciones para bloques dinámicos

El `for_each` de un bloque dinámico no tiene las mismas restricciones de identidad que el de un recurso.

### 9.1. Colecciones habituales

Puedes generar bloques desde:

- Listas.
- Mapas.
- Conjuntos.
- Valores producidos mediante expresiones `for`.

### 9.2. Diferencia importante

Los bloques generados no son instancias independientes de recursos.

### 9.3. Orden

El esquema del proveedor puede tratar los bloques como listas o conjuntos.

No presupongas que el orden escrito será una identidad estable.

---

## 10. Lo que `dynamic` no puede generar

Algunos bloques deben procesarse antes de evaluar la generación dinámica.

### 10.1. Limitación principal

No utilices `dynamic` para generar:

- `lifecycle`.
- Bloques de provisionadores.
- Metaargumentos como `count` o `for_each`.

### 10.2. Ejemplo incorrecto

```hcl
# No utilizar:
# dynamic "lifecycle" {
#   ...
# }
```

### 10.3. Alternativa

Escribe las reglas de ciclo de vida de forma explícita.

---

## 11. Cuándo conviene utilizar `dynamic`

La generación dinámica debe aportar claridad o reutilización.

### 11.1. Buenos candidatos

- Varias reglas CORS con una estructura común.
- Configuraciones repetidas proporcionadas como entrada.
- Bloques opcionales dentro de un recurso.
- Interfaces de módulos que necesitan aceptar colecciones.

### 11.2. Uso excesivo

Una sola estructura fija puede resultar más clara como bloque literal.

### 11.3. Criterio

No conviertas toda la configuración en una capa de abstracción sin necesidad.

### 11.4. Pregunta útil

¿La colección representa una necesidad real o solo evita escribir unas pocas líneas?

---

## 12. Bloques anidados opcionales

Puedes generar cero o un bloque a partir de una condición.

### 12.1. Patrón conceptual

```hcl
dynamic "example_block" {
  for_each = var.enable_feature ? [var.feature_config] : []

  content {
    name = example_block.value.name
  }
}
```

Este fragmento ilustra el patrón; no pertenece al laboratorio S3.

### 12.2. Resultado

Una colección vacía genera ningún bloque.

Una colección con un elemento genera un bloque.

### 12.3. Restricción

El recurso debe admitir ese bloque y su ausencia.

---

## 13. Bloques dinámicos anidados

Una estructura de varios niveles puede necesitar varios iteradores.

### 13.1. Patrón conceptual

```hcl
dynamic "outer_block" {
  for_each = var.groups
  iterator = group

  content {
    dynamic "inner_block" {
      for_each = group.value.items
      iterator = item

      content {
        name = item.value.name
      }
    }
  }
}
```

### 13.2. Recomendación

Nombra cada iterador según la entidad que representa.

---

## 14. Qué es `lifecycle`

El bloque `lifecycle` define reglas operativas para un recurso.

### 14.1. Ejemplo

```hcl
lifecycle {
  prevent_destroy = true
}
```

### 14.2. Responsabilidad

Puede modificar cómo Terraform planifica determinados cambios.

También puede incorporar condiciones verificables.

### 14.3. Ubicación

Se escribe dentro del bloque de recurso correspondiente.

### 14.4. Precaución

Una regla de ciclo de vida no sustituye permisos, copias de seguridad ni revisión humana.

---

## 15. Reglas principales de ciclo de vida

Cada regla responde a un problema distinto.

### 15.1. Referencia rápida

| **Regla** | **Objetivo** | **Precaución principal** |
|-----------|-------------|--------------------------|
| `create_before_destroy` | Crear el reemplazo antes de eliminar | Puede impedirlo el servicio |
| `prevent_destroy` | Rechazar destrucciones planificadas | Depende de conservar la regla |
| `ignore_changes` | Ignorar cambios concretos en actualizaciones | Puede ocultar deriva |
| `replace_triggered_by` | Reemplazar ante cambios relacionados | Puede ampliar interrupciones |

Ninguna regla convierte todas las operaciones en una transacción.

### 15.2. Condiciones

`precondition` y `postcondition` permiten declarar expectativas.

### 15.3. Revisión

Cada regla debe incluir una justificación operativa.

---

## 16. Valores literales en reglas operativas

Las reglas que afectan al grafo se procesan en una fase temprana.

### 16.1. Ejemplo incorrecto

```hcl
# No utilizar:
# lifecycle {
#   prevent_destroy = var.protect_resource
# }
```

### 16.2. Consecuencia

No diseñes una interfaz suponiendo que puedes activar cualquier regla mediante una variable.

### 16.3. Condiciones verificables

Las expresiones de `precondition` y `postcondition` sí permiten cálculos compatibles con su contexto.

### 16.4. Regla práctica

Distingue reglas operativas estáticas de condiciones evaluables.

---

## 17. `create_before_destroy`

La regla cambia el orden de un reemplazo.

### 17.1. Comportamiento normal

Un reemplazo puede destruir primero y crear después.

### 17.2. Con la regla

```hcl
lifecycle {
  create_before_destroy = true
}
```

Terraform intenta crear el reemplazo antes de eliminar el anterior.

### 17.3. Límite

El servicio debe permitir que ambos objetos coexistan.

### 17.4. Ejemplo

Dos buckets necesitan nombres diferentes para coexistir.

---

## 18. Coexistencia y propagación

Crear primero no garantiza un reemplazo sin interrupciones.

### 18.1. Condiciones necesarias

Revisa:

- Unicidad de nombres.
- Límites de capacidad.
- Permisos.
- Dependencias.
- Compatibilidad entre versiones.
- Forma de trasladar consumidores.

### 18.2. Propagación

Terraform puede propagar esta regla a dependencias cuando lo requiere el grafo.

### 18.3. Precaución

No interpretes la regla como una propiedad totalmente aislada.

Revisa el plan de todos los recursos relacionados.

---

## 19. `prevent_destroy`

La regla rechaza planes que destruirían un recurso protegido.

### 19.1. Configuración

```hcl
lifecycle {
  prevent_destroy = true
}
```

### 19.2. Operaciones afectadas

Puede bloquear una destrucción directa.

También puede bloquear un reemplazo que incluye eliminación.

### 19.3. Límite importante

Si eliminas completamente el bloque de recurso de la configuración, desaparece su protección declarada.

### 19.4. Conclusión operativa

No es un mecanismo de protección permanente del servicio remoto.

---

## 20. Límites de la protección

`prevent_destroy` pertenece a Terraform, no a S3.

### 20.1. Lo que no impide

No bloquea:

- Eliminaciones mediante AWS CLI.
- Operaciones de otros usuarios.
- Pérdida de datos en el emulador.
- Cambios externos.
- Eliminaciones realizadas por otras configuraciones.

### 20.2. Producción

Combina controles del servicio, permisos, retención y copias de seguridad.

### 20.3. Laboratorio

Retira la regla conscientemente antes de limpiar los recursos protegidos.

---

## 21. `ignore_changes`

La regla permite delegar determinados atributos a otro gestor.

### 21.1. Ejemplo

```hcl
lifecycle {
  ignore_changes = [
    tags["ExternalOwner"]
  ]
}
```

### 21.2. Alcance

Terraform utiliza la configuración durante la creación.

Después ignora diferencias de ese atributo al planificar actualizaciones.

### 21.3. Riesgo

La regla puede ocultar cambios inesperados.

### 21.4. Recomendación

Ignora atributos concretos y documenta quién los administra.

---

## 22. Ignorar todo un recurso

Existe una opción amplia para ignorar cambios de atributos.

### 22.1. Ejemplo conceptual

```hcl
lifecycle {
  ignore_changes = all
}
```

### 22.2. Efecto

Terraform puede crear o destruir el recurso.

No propone actualizaciones ordinarias de sus atributos.

### 22.3. Advertencia

Esta opción reduce de forma importante la convergencia declarativa.

### 22.4. Criterio

No la utilices para silenciar diferencias que todavía no entiendes.

---

## 23. `replace_triggered_by`

Esta regla vincula el reemplazo a acciones sobre otros elementos gestionados.

### 23.1. Ejemplo conceptual

```hcl
lifecycle {
  replace_triggered_by = [
    terraform_data.release
  ]
}
```

### 23.2. Responsabilidad

Un cambio relevante en el elemento referenciado puede provocar el reemplazo del consumidor.

### 23.3. Restricción

Las referencias deben apuntar a recursos gestionados o atributos adecuados.

### 23.4. No utilizar directamente

Una variable o un local no tiene acciones de recurso que puedan activar esta regla.

---

## 24. El recurso `terraform_data`

Terraform incluye un recurso para representar datos dentro del ciclo gestionado.

### 24.1. Ejemplo

```hcl
resource "terraform_data" "release" {
  input = var.release_revision
}
```

### 24.2. Utilidad

Puede servir como puente entre una entrada y `replace_triggered_by`.

### 24.3. Alcance

No crea un recurso AWS.

Se gestiona mediante el proveedor integrado de Terraform.

### 24.4. Precaución

Utilízalo cuando la relación de reemplazo tenga sentido, no para añadir pasos arbitrarios.

---

## 25. Precondiciones y postcondiciones

Las condiciones expresan expectativas sobre una operación.

### 25.1. Precondición

```hcl
precondition {
  condition     = var.environment == "local"
  error_message = "Este laboratorio solo admite el entorno local."
}
```

### 25.2. Postcondición

Puede utilizar `self` para consultar atributos del recurso actual.

### 25.3. Momento de evaluación

Terraform evalúa las condiciones cuando dispone de información suficiente.

### 25.4. Límite

Una postcondición fallida no revierte automáticamente las operaciones ya completadas.

---

## 26. Ciclo de vida de Terraform y de S3

Los términos se parecen, pero sus responsabilidades son diferentes.

### 26.1. Comparación

| **Concepto** | **Quién lo aplica** | **Ejemplo** |
|--------------|---------------------|-------------|
| `lifecycle` de Terraform | Terraform | Impedir una destrucción planificada |
| Lifecycle de S3 | Servicio S3 | Expirar objetos tras cierto tiempo |
| CORS de S3 | Servicio S3 | Autorizar interacción desde determinados orígenes |
| Verificación funcional | Herramientas o aplicación | Comprobar una descarga |

El laboratorio principal utiliza CORS y reglas de Terraform.

### 26.2. Advertencia

Una política S3 no se ejecuta dentro del plan de Terraform.

### 26.3. Emulación

No presupongas que LocalStack reproduce todas las tareas programadas del servicio.

---

## 27. Preparación del laboratorio

Crearemos un proyecto independiente.

### 27.1. Directorios

```bash
mkdir -p terraform-dynamic-lifecycle/planes
mkdir -p terraform-dynamic-lifecycle/descargas
cd terraform-dynamic-lifecycle
```

### 27.2. Estructura

```text
terraform-dynamic-lifecycle/
├── compose.yaml
├── .env
├── versions.tf
├── providers.tf
├── variables.tf
├── terraform.tfvars
├── main.tf
└── outputs.tf
```

---

## 28. Protección de archivos

Los planes y estados requieren protección.

### 28.1. `.gitignore`

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

### 28.2. Qué versionar

Versiona la configuración y `.terraform.lock.hcl` del proyecto raíz.

### 28.3. Precaución

Las exportaciones JSON también pueden contener datos sensibles.

---

## 29. Selección y arranque de LocalStack

El docente debe proporcionar una referencia de imagen validada.

### 29.1. Selección

Sustituye el marcador:

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 29.2. `compose.yaml`

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

### 29.3. Arranque

Ejecuta `docker compose up -d` y comprueba el contenedor.

---

## 30. Credenciales y conectividad

AWS CLI utilizará valores ficticios.

### 30.1. Terminal

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
```

### 30.2. Consulta

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3api list-buckets
```

### 30.3. Condición para continuar

Espera una respuesta válida antes de aplicar Terraform.

---

## 31. Requisitos y proveedor

Crea los archivos de conexión.

### 31.1. `versions.tf`

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

### 31.2. `providers.tf`

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

## 32. Variables generales

Crea `variables.tf`.

### 32.1. Declaraciones

```hcl
variable "suffix" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.suffix))
    error_message = "Usa entre 4 y 8 caracteres alfanuméricos."
  }
}

variable "environment" {
  type    = string
  default = "local"
}

variable "release_revision" {
  type    = string
  default = "v1"
}
```

### 32.2. Uso

Estas entradas controlan identidad y revisión del documento.

---

## 33. Variable de reglas CORS

Añade la colección al mismo archivo.

### 33.1. Tipo estructurado

```hcl
variable "cors_rules" {
  type = map(object({
    allowed_methods = set(string)
    allowed_origins = set(string)
    allowed_headers = optional(set(string), [])
    expose_headers  = optional(set(string), [])
    max_age_seconds = optional(number, 300)
  }))

  nullable = false

  validation {
    condition = (
      length(var.cors_rules) > 0 &&
      alltrue([
        for rule in values(var.cors_rules) :
        length(rule.allowed_origins) > 0 &&
        length(rule.allowed_methods) > 0 &&
        length(setsubtract(
          rule.allowed_methods,
          toset(["GET", "PUT", "POST", "DELETE", "HEAD"])
        )) == 0
      ])
    )
    error_message = "Define reglas con orígenes y métodos S3 admitidos."
  }
}
```

---

## 34. Valores del laboratorio

Crea `terraform.tfvars`.

### 34.1. Configuración inicial

```hcl
suffix           = "alumno01"
environment      = "local"
release_revision = "v1"

cors_rules = {
  frontend = {
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["https://app.example.test"]
    expose_headers  = ["ETag"]
  }

  development = {
    allowed_methods = ["GET"]
    allowed_origins = ["http://localhost:3000"]
    allowed_headers = ["*"]
    max_age_seconds = 60
  }
}
```

### 34.2. Advertencia

Los orígenes son ejemplos; no necesitas servidores web en esas direcciones.

---

## 35. Bucket y reglas estáticas de ciclo de vida

Crea `main.tf`.

### 35.1. Recurso principal

```hcl
resource "aws_s3_bucket" "lab" {
  bucket        = "curso-dynamic-${var.suffix}"
  force_destroy = true

  tags = {
    Laboratory   = "LocalStack"
    ManagedBy    = "Terraform"
    ExternalOwner = "initial"
  }

  lifecycle {
    create_before_destroy = true

    ignore_changes = [
      tags["ExternalOwner"]
    ]

    precondition {
      condition     = var.environment == "local"
      error_message = "Este laboratorio solo admite environment = local."
    }

    postcondition {
      condition     = self.tags["Laboratory"] == "LocalStack"
      error_message = "El bucket debe conservar su etiqueta de laboratorio."
    }
  }
}
```

---

## 36. Configuración CORS generada

Añade el recurso CORS a `main.tf`.

### 36.1. Bloque dinámico

```hcl
resource "aws_s3_bucket_cors_configuration" "lab" {
  bucket = aws_s3_bucket.lab.id

  dynamic "cors_rule" {
    for_each = var.cors_rules
    iterator = rule

    content {
      id              = rule.key
      allowed_methods = sort(tolist(rule.value.allowed_methods))
      allowed_origins = sort(tolist(rule.value.allowed_origins))
      allowed_headers = sort(tolist(rule.value.allowed_headers))
      expose_headers  = sort(tolist(rule.value.expose_headers))
      max_age_seconds = rule.value.max_age_seconds
    }
  }
}
```

### 36.2. Dependencia

La referencia al bucket expresa la relación sin un `depends_on` adicional.

---

## 37. Documento y disparador de reemplazo

Añade los recursos al mismo archivo.

### 37.1. Configuración

```hcl
resource "terraform_data" "release" {
  input = var.release_revision
}

resource "aws_s3_object" "release" {
  bucket       = aws_s3_bucket.lab.id
  key          = "releases/${var.release_revision}.json"
  content_type = "application/json"

  content = jsonencode({
    revision    = var.release_revision
    environment = var.environment
  })

  lifecycle {
    replace_triggered_by = [
      terraform_data.release
    ]

    precondition {
      condition     = can(regex("^v[0-9]+$", var.release_revision))
      error_message = "Usa revisiones como v1, v2 o v3."
    }
  }
}
```

---

## 38. Outputs e inicialización

Crea `outputs.tf`.

### 38.1. Salidas

```hcl
output "bucket_name" {
  value = aws_s3_bucket.lab.bucket
}

output "release_key" {
  value = aws_s3_object.release.key
}

output "cors_rule_ids" {
  value = sort(keys(var.cors_rules))
}
```

### 38.2. Preparación

```bash
terraform init
terraform fmt -recursive
terraform validate
```

---

## 39. Sesión 1: revisar y desplegar

Duración orientativa: 25 minutos.

### 39.1. Plan guardado

```bash
terraform plan -out=planes/create.tfplan
terraform show planes/create.tfplan
```

### 39.2. Recursos esperados

Deben crearse cuatro recursos gestionados.

Tres corresponden a operaciones sobre S3.

El cuarto es `terraform_data.release`.

### 39.3. Aplicación

```bash
terraform apply planes/create.tfplan
terraform state list
```

### 39.4. Observación

Las reglas CORS generadas no aparecen como recursos independientes.

---

## 40. Sesión 2: verificar CORS y contenido

La verificación debe consultar el servicio.

### 40.1. Variables

```bash
BUCKET="$(terraform output -raw bucket_name)"
RELEASE_KEY="$(terraform output -raw release_key)"
```

### 40.2. Consultas

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3api get-bucket-cors --bucket "$BUCKET" > descargas/cors.json

aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3 cp "s3://${BUCKET}/${RELEASE_KEY}" descargas/release.json
```

### 40.3. Lectura

Ejecuta `jq '.'` sobre ambos archivos y comprueba los valores.

### 40.4. Límite

Consultar CORS no demuestra por sí solo el comportamiento de un navegador.

---

## 41. Sesión 3: añadir una regla dinámica

La actividad demuestra que se actualiza configuración interna.

### 41.1. Nueva entrada

Añade dentro de `cors_rules`:

```hcl
documentation = {
  allowed_methods = ["GET", "HEAD"]
  allowed_origins = ["https://docs.example.test"]
  max_age_seconds = 120
}
```

### 41.2. Revisión

Genera un plan y localiza el nuevo bloque `cors_rule`.

### 41.3. Resultado esperado

Se actualiza el recurso CORS existente.

No se crea un recurso Terraform separado para esa regla.

### 41.4. Aplicación

Aplica el plan revisado y consulta nuevamente `get-bucket-cors`.

---

## 42. Sesión 4: eliminar una regla

La ausencia de un elemento cambia la configuración declarada.

### 42.1. Actividad

Elimina `development` del mapa.

### 42.2. Plan

```bash
terraform plan -out=planes/remove-cors.tfplan
terraform show planes/remove-cors.tfplan
```

### 42.3. Interpretación

Terraform debe retirar la regla de la configuración CORS.

No destruye por ello el bucket.

### 42.4. Precaución

No dejes el mapa vacío: la variable y el recurso requieren reglas.

### 42.5. Entregable

Explica la diferencia entre eliminar un bloque anidado y destruir una instancia.

---

## 43. Sesión 5: observar `ignore_changes`

Esta prueba modifica una etiqueta mediante AWS CLI.

### 43.1. Cambio externo

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3api put-bucket-tagging \
  --bucket "$BUCKET" \
  --tagging '{"TagSet":[
    {"Key":"Laboratory","Value":"LocalStack"},
    {"Key":"ManagedBy","Value":"Terraform"},
    {"Key":"ExternalOwner","Value":"external-team"}
  ]}'
```

### 43.2. Advertencia

`put-bucket-tagging` sustituye el conjunto de etiquetas.

Por eso conservamos explícitamente las otras etiquetas.

### 43.3. Plan

Un plan normal no debería restaurar únicamente `ExternalOwner` a `"initial"`.

---

## 44. Sesión 6: comprobar el alcance del atributo ignorado

El resto de etiquetas sigue gestionado por Terraform.

### 44.1. Actividad

Modifica `ManagedBy` externamente y conserva las otras etiquetas.

### 44.2. Plan esperado

Terraform debe proponer restaurar `ManagedBy`.

### 44.3. Comparación

`ExternalOwner` está delegado.

`ManagedBy` continúa bajo gestión declarativa.

### 44.4. Verificación

Consulta las etiquetas antes y después de aplicar el plan.

### 44.5. Entregable

Documenta el propietario de cada atributo y por qué se comparte la gestión.

---

## 45. Sesión 7: practicar `prevent_destroy`

Añade temporalmente la regla al `lifecycle` del bucket.

### 45.1. Línea adicional

```hcl
prevent_destroy = true
```

No crees un segundo bloque `lifecycle`.

### 45.2. Intento

```bash
terraform plan -destroy
```

### 45.3. Resultado esperado

Terraform debe rechazar la destrucción del bucket protegido.

### 45.4. Restauración

Retira la línea antes de continuar.

### 45.5. Advertencia

No elimines el bloque de recurso para intentar conservar esta protección.

---

## 46. Sesión 8: observar `create_before_destroy`

El objetivo es revisar el orden, no garantizar continuidad.

### 46.1. Plan temporal

```bash
terraform plan \
  -var='suffix=alumno02' \
  -out=planes/replace-bucket.tfplan
```

### 46.2. Observación

El nuevo bucket tiene un nombre diferente.

Revisa la acción de reemplazo y sus dependientes.

### 46.3. Precaución

No presupongas el mismo comportamiento con un nombre fijo.

### 46.4. No aplicar

Esta sesión puede realizarse únicamente mediante revisión del plan.

---

## 47. Sesión 9: comprobar `replace_triggered_by`

La revisión provoca un cambio en el recurso de datos.

### 47.1. Plan

```bash
terraform plan \
  -var='release_revision=v2' \
  -out=planes/release-v2.tfplan
```

### 47.2. Resultado esperado

Cambia `terraform_data.release`.

El objeto `release` se reemplaza por la regla declarada.

### 47.3. Aplicación

Revisa y aplica el plan; después descarga el nuevo documento.

### 47.4. Nota

El cambio de clave también representa otra ubicación S3, pero el disparador garantiza un reemplazo.

---

## 48. Sesión 10: provocar una precondición fallida

Las condiciones deben producir mensajes comprensibles.

### 48.1. Prueba

```bash
terraform plan -var='environment=prod'
```

### 48.2. Resultado esperado

La precondición del bucket debe rechazar la configuración.

### 48.3. Segunda prueba

```bash
terraform plan -var='release_revision=release-final'
```

### 48.4. Interpretación

La precondición del objeto debe rechazar el formato de revisión.

### 48.5. Límite

Las condiciones validan expectativas declaradas, no todas las propiedades de seguridad del entorno.

---

## 49. Limpieza y diferencias respecto a AWS real

Mantén LocalStack activo hasta completar la destrucción.

### 49.1. Limpieza

```bash
terraform plan -destroy -out=planes/destroy.tfplan
terraform show planes/destroy.tfplan
terraform apply planes/destroy.tfplan
terraform state list
aws --endpoint-url=http://localhost:4566 --region us-east-1 s3api list-buckets
docker compose down
```

### 49.2. Antes de ejecutar

Comprueba que retiraste `prevent_destroy`.

### 49.3. AWS real

Revisa costes, permisos, nombres únicos, retención y comportamiento CORS efectivo.

LocalStack no demuestra compatibilidad completa ni seguridad de producción.

---

## 50. Ejercicios y resumen

Consolida las decisiones antes de reutilizar los patrones.

### 50.1. Ejercicios

1. Añade otra regla CORS mediante el mapa.
2. Explica por qué no tiene dirección independiente.
3. Documenta un atributo delegado con `ignore_changes`.
4. Observa un reemplazo sin aplicarlo.
5. Provoca una precondición fallida.
6. Distingue el ciclo de vida de Terraform del de S3.
7. Destruye y verifica el laboratorio.

### 50.2. Ideas esenciales

`dynamic` genera estructura admitida por el proveedor.

`lifecycle` ajusta decisiones y expectativas de Terraform.

### 50.3. Idea final

Utiliza ambos mecanismos para expresar requisitos reales, mantener claridad y revisar consecuencias antes de aplicar.