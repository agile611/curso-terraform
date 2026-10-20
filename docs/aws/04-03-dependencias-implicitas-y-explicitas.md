# Dependencias implícitas y explícitas en Terraform

Terraform no ejecuta los archivos de configuración como una lista de instrucciones.

Construye un grafo de relaciones y utiliza ese grafo para organizar las operaciones.

Las dependencias indican qué elementos necesitan información o resultados de otros elementos.

Comprenderlas permite escribir configuraciones correctas sin imponer órdenes innecesarios.

En esta lección practicarás con buckets y objetos S3 emulados mediante LocalStack.

La plataforma de referencia es AWS.

El laboratorio se ejecuta localmente, utiliza credenciales ficticias y no necesita una cuenta real de AWS.

> **Idea principal:** utiliza referencias para expresar relaciones de datos.
>
> Añade `depends_on` únicamente cuando exista una dependencia de comportamiento que esas referencias no representen.
>
> Una dependencia no constituye una comprobación completa de disponibilidad de una aplicación.

---

## 1. Objetivos

La lección combina fundamentos del grafo y sesiones de práctica.

### 1.1. Objetivos de aprendizaje

Al finalizar podrás:

- Diferenciar dependencias implícitas y explícitas.
- Reconocer referencias que generan relaciones.
- Explicar por qué los archivos no establecen el orden.
- Utilizar `depends_on` con criterio.
- Interpretar operaciones concurrentes.
- Comprender efectos sobre fuentes de datos.
- Reconocer dependencias entre módulos.
- Diagnosticar ciclos.
- Verificar recursos después de aplicar.
- Explicar el orden de destrucción.

### 1.2. Resultado práctico

Construirás un bucket con documentos y un marcador de publicación.

Utilizarás referencias y dependencias explícitas para expresar sus relaciones.

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

El proveedor AWS se mantiene en la serie 5.x como base didáctica.

### 2.2. Conocimientos recomendados

Debes reconocer recursos, variables, locales, outputs y fuentes de datos.

También debes saber revisar un plan guardado antes de aplicarlo.

Los comandos utilizan una terminal compatible con Bash.

---

## 3. Versiones y compatibilidad del laboratorio

La combinación de herramientas debe comprobarse antes de impartir la práctica.

### 3.1. Responsabilidad del docente

Selecciona una imagen fija de LocalStack.

Verifica en la edición elegida:

- Creación de buckets.
- Escritura de objetos.
- Lectura de objetos.
- Consulta de etiquetas.
- Eliminación de recursos.
- Lectura de la fuente de datos utilizada.

### 3.2. Registro

Documenta versiones de Terraform, proveedor, AWS CLI y LocalStack.

No presupongas compatibilidad completa por utilizar S3.

### 3.3. Criterio

Las versiones indicadas son restricciones del curso.

No representan una afirmación sobre cuáles son las versiones más recientes.

---

## 4. Qué es una dependencia

Una dependencia expresa que un elemento necesita otro para realizar correctamente una operación.

### 4.1. Ejemplo cotidiano

Para almacenar un objeto S3, primero debe existir el bucket correspondiente.

El objeto depende del bucket.

### 4.2. Relación conceptual

```text
Bucket → Objeto
```

En los dibujos de esta página, la flecha significa:

```text
Debe estar disponible antes de la operación dependiente.
```

### 4.3. No confundir conceptos

Dependencia no significa cercanía en un archivo.

Tampoco significa que dos recursos compartan una etiqueta.

Terraform necesita una relación expresada en la configuración.

---

## 5. El grafo de Terraform

Terraform representa las relaciones mediante un grafo dirigido.

### 5.1. Elementos del grafo

Pueden intervenir:

- Recursos.
- Configuraciones de proveedores.
- Fuentes de datos.
- Expresiones y resultados.
- Operaciones de creación y destrucción.
- Instancias de módulos.

### 5.2. Utilidad

El grafo permite identificar operaciones que pueden avanzar en paralelo.

También permite detectar relaciones circulares.

### 5.3. Precaución

El grafo interno no es simplemente una lista de recursos.

Terraform puede representar nodos auxiliares y operaciones diferenciadas.

Los esquemas de esta lección simplifican ese funcionamiento.

---

## 6. Los archivos no establecen una secuencia

Terraform combina los archivos `.tf` del módulo.

### 6.1. Convención habitual

```text
main.tf
variables.tf
locals.tf
outputs.tf
```

Esos nombres organizan el trabajo humano.

No indican fases de ejecución.

### 6.2. Ejemplo

Un recurso situado en `01-bucket.tf` no se crea necesariamente antes de otro situado en `99-object.tf`.

### 6.3. Regla

El orden se deriva del grafo.

No se deriva de los números del nombre.

### 6.4. Consecuencia

Renombrar archivos no corrige una dependencia ausente.

Debes revisar las referencias y las relaciones declaradas.

---

## 7. Dependencias implícitas

Una dependencia implícita aparece cuando una expresión referencia otro elemento.

### 7.1. Ejemplo

```hcl
resource "aws_s3_object" "readme" {
  bucket = aws_s3_bucket.lab.id
  key    = "README.txt"

  content = "Laboratorio de dependencias."
}
```

### 7.2. Interpretación

El objeto necesita el identificador del bucket.

La referencia permite a Terraform reconocer esa relación.

### 7.3. Ventaja

La expresión entrega el dato correcto y documenta la dependencia.

### 7.4. Recomendación

Este es el mecanismo preferido cuando existe una relación de datos.

---

## 8. Nombres literales y dependencias ausentes

Un nombre escrito como cadena no referencia un recurso.

### 8.1. Ejemplo incompleto

```hcl
resource "aws_s3_object" "readme" {
  bucket  = "curso-dependencias-dev-alumno01"
  key     = "README.txt"
  content = "Ejemplo conceptual."
}
```

### 8.2. Problema

Terraform no deduce que esa cadena coincide con otro recurso de la configuración.

El objeto puede intentar crearse sin una relación adecuada con el bucket.

### 8.3. Corrección preferida

```hcl
bucket = aws_s3_bucket.lab.id
```

### 8.4. Nota

Un fallo puede depender del tiempo y no reproducirse siempre.

Una ejecución correcta no demuestra que el grafo sea correcto.

---

## 9. Compartir un local no conecta recursos

Dos recursos pueden utilizar el mismo local sin depender entre sí.

### 9.1. Ejemplo conceptual

```hcl
locals {
  bucket_name = "curso-dependencias-dev-alumno01"
}
```

El bucket utiliza `local.bucket_name`.

El objeto también utiliza `local.bucket_name`.

### 9.2. Relación real

Ambos dependen de una expresión común.

El objeto no referencia necesariamente al recurso bucket.

### 9.3. Solución

Utiliza el atributo del recurso:

```hcl
bucket = aws_s3_bucket.lab.id
```

### 9.4. Lección

Coincidencia de valores no equivale a dependencia entre recursos.

---

## 10. Referencias a través de locales

Un local sí puede transportar una referencia a un recurso.

### 10.1. Ejemplo

```hcl
locals {
  managed_bucket_id = aws_s3_bucket.lab.id
}
```

Después:

```hcl
bucket = local.managed_bucket_id
```

### 10.2. Interpretación

La expresión del local referencia al bucket gestionado.

Terraform puede seguir esa relación.

### 10.3. Diferencia clave

No es equivalente a un local que solo construye una cadena.

### 10.4. Criterio

Revisa el origen de la expresión, no solamente el nombre del local.

---

## 11. Valores conocidos y dependencias

Un valor puede conocerse durante el plan y seguir generando una dependencia.

### 11.1. Ejemplo

El nombre del bucket puede derivarse de una variable conocida.

Aun así, esta referencia conecta el objeto con el recurso:

```hcl
bucket = aws_s3_bucket.lab.bucket
```

### 11.2. Regla

La dependencia se deriva de la referencia declarada.

No exige que el valor aparezca como desconocido.

### 11.3. Error frecuente

Pensar que una referencia solo importa cuando muestra:

```text
known after apply
```

### 11.4. Corrección

Información pendiente y dependencia son conceptos relacionados, pero distintos.

---

## 12. Dependencias explícitas con `depends_on`

`depends_on` declara una relación que no aparece suficientemente en los argumentos.

### 12.1. Sintaxis

```hcl
depends_on = [
  aws_s3_object.configuration
]
```

### 12.2. Contenido

La lista contiene referencias a recursos o módulos adecuados del mismo contexto.

No contiene cadenas con direcciones.

### 12.3. Ejemplo incorrecto

```hcl
# No utilizar:
# depends_on = ["aws_s3_object.configuration"]
```

### 12.4. Recomendación

Documenta el motivo de la relación explícita.

El comentario debe explicar el comportamiento requerido.

---

## 13. Cuándo utilizar una dependencia explícita

La necesidad suele aparecer cuando existe un requisito operativo oculto.

### 13.1. Ejemplos conceptuales

- Una operación necesita que exista una configuración de permisos.
- Un marcador debe publicarse después de varios documentos.
- Una consulta debe esperar una operación previa que no figura en sus argumentos.

### 13.2. Pregunta principal

¿El consumidor necesita un comportamiento previo, aunque no utilice un atributo de ese elemento?

### 13.3. Si la respuesta es sí

Una dependencia explícita puede estar justificada.

### 13.4. Si existe un dato natural

Utiliza primero la referencia a ese dato.

No añadas relaciones redundantes por costumbre.

---

## 14. Dependencias redundantes

Una relación explícita puede repetir una relación ya existente.

### 14.1. Ejemplo

```hcl
resource "aws_s3_object" "readme" {
  bucket  = aws_s3_bucket.lab.id
  key     = "README.txt"
  content = "Ejemplo."

  depends_on = [aws_s3_bucket.lab]
}
```

### 14.2. Evaluación

La referencia a `id` ya expresa la dependencia.

### 14.3. Recomendación

Elimina la declaración redundante.

### 14.4. Motivo

La configuración debe comunicar relaciones necesarias.

Más dependencias no significa automáticamente más seguridad.

---

## 15. Dependencias y paralelismo

Terraform puede procesar nodos independientes de forma concurrente.

### 15.1. Ejemplo

```text
         ┌→ Documento de configuración
Bucket ──┤
         └→ Documento de instrucciones
```

Ambos objetos necesitan el bucket.

No necesitan necesariamente esperarse entre sí.

### 15.2. Ventaja

Las operaciones independientes pueden aprovechar el paralelismo.

### 15.3. Precaución

El orden de las líneas de terminal no debe convertirse en un contrato.

### 15.4. Regla

Especifica únicamente las relaciones que el sistema realmente requiere.

---

## 16. La opción `-parallelism`

Esta opción limita el número de operaciones concurrentes del grafo.

### 16.1. Ejemplo

```bash
terraform apply -parallelism=1 plan.tfplan
```

### 16.2. Qué hace

Reduce el grado de concurrencia.

### 16.3. Qué no hace

No añade una relación semántica ausente.

No garantiza que un recurso sin dependencia quede después de otro concreto.

### 16.4. Uso adecuado

Puede ayudar a investigar problemas o respetar límites operativos.

No debe utilizarse para ocultar errores de modelado.

---

## 17. Dependencia y disponibilidad

Terraform puede finalizar una operación sin que una aplicación completa esté lista.

### 17.1. Ejemplo conceptual

Crear una máquina no demuestra que su servidor web esté respondiendo.

### 17.2. S3 en este laboratorio

Un objeto creado correctamente debe poder consultarse según el comportamiento del servicio.

Pero el laboratorio no incluye una aplicación consumidora real.

### 17.3. Marcador de publicación

El marcador expresa orden de operaciones.

No demuestra pruebas funcionales de todos los documentos.

### 17.4. Regla

Separa creación, disponibilidad y verificación.

---

## 18. Preparación del laboratorio

Crearemos un proyecto independiente.

### 18.1. Directorios

```bash
mkdir -p terraform-dependencias-localstack/planes
mkdir -p terraform-dependencias-localstack/descargas
cd terraform-dependencias-localstack
```

### 18.2. Estructura principal

```text
terraform-dependencias-localstack/
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

## 19. Protección de archivos

Los artefactos requieren protección aunque el laboratorio use datos ficticios.

### 19.1. Archivo `.gitignore`

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

### 19.2. Qué conservar

Versiona configuración y archivo de bloqueo del proyecto raíz.

### 19.3. Qué evitar

No publiques estados ni planes de proyectos reales.

Los informes JSON también pueden contener información sensible.

---

## 20. Selección y arranque de LocalStack

Utiliza una imagen validada por el docente.

### 20.1. Selección

Sustituye el marcador:

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 20.2. Archivo `compose.yaml`

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

### 20.3. Arranque

Ejecuta `docker compose up -d` y comprueba el contenedor.

---

## 21. Credenciales y comprobación inicial

AWS CLI utiliza credenciales ficticias.

### 21.1. Terminal

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
```

### 21.2. Consulta

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3api list-buckets
```

### 21.3. Condición para continuar

Espera una respuesta válida.

Si falla, consulta `docker compose logs --tail=100 localstack`.

---

## 22. Requisitos y proveedor

Crea los archivos de conexión.

### 22.1. `versions.tf`

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

### 22.2. `providers.tf`

```hcl
provider "aws" {
  region = "us-east-1"
  access_key = "test"
  secret_key = "test"
  skip_credentials_validation = true
  skip_metadata_api_check = true
  skip_requesting_account_id = true
  s3_use_path_style = true
  endpoints { s3 = "http://localhost:4566" }
}
```

---

## 23. Variables y valores

Los nombres se parametrizan para cada alumno.

### 23.1. `variables.tf`

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

### 23.2. `terraform.tfvars`

```hcl
suffix = "alumno01"
```

### 23.3. `locals.tf`

```hcl
locals {
  bucket_name = "curso-dependencias-dev-${var.suffix}"
}
```

---

## 24. Bucket y documento de configuración

Crea `main.tf` con estos recursos.

### 24.1. Configuración

```hcl
resource "aws_s3_bucket" "lab" {
  bucket        = local.bucket_name
  force_destroy = true

  tags = {
    Laboratory = "LocalStack"
    ManagedBy  = "Terraform"
  }
}

resource "aws_s3_object" "configuration" {
  bucket       = aws_s3_bucket.lab.id
  key          = "config/settings.json"
  content_type = "application/json"

  content = jsonencode({
    project = "curso-dependencias"
    mode    = "local"
  })
}
```

La referencia conecta el objeto con el bucket.

---

## 25. Documento de instrucciones y manifiesto

Añade estos recursos a `main.tf`.

### 25.1. Configuración

```hcl
resource "aws_s3_object" "instructions" {
  bucket       = aws_s3_bucket.lab.id
  key          = "docs/README.txt"
  content_type = "text/plain"
  content      = "Consultar config/settings.json antes de usar el laboratorio."
}

resource "aws_s3_object" "manifest" {
  bucket       = aws_s3_bucket.lab.id
  key          = "manifest.json"
  content_type = "application/json"

  content = jsonencode({
    configuration_key = aws_s3_object.configuration.key
    instructions_key  = aws_s3_object.instructions.key
    configuration_sha = sha256(aws_s3_object.configuration.content)
    instructions_sha  = sha256(aws_s3_object.instructions.content)
  })
}
```

El manifiesto referencia ambos documentos y genera dependencias implícitas.

---

## 26. Marcador de publicación explícito

Añade el marcador a `main.tf`.

### 26.1. Configuración

```hcl
resource "aws_s3_object" "ready" {
  bucket       = aws_s3_bucket.lab.id
  key          = "_publication/READY.txt"
  content_type = "text/plain"
  content      = "Documentos publicados por Terraform."

  # Publicar después de completar las operaciones del manifiesto.
  # El contenido del marcador no utiliza atributos del manifiesto.
  depends_on = [
    aws_s3_object.manifest
  ]
}
```

### 26.2. Justificación

Existe un requisito de publicación posterior.

No existe una relación de datos con el manifiesto en los argumentos.

Por eso añadimos la dependencia explícita.

---

## 27. Salidas y grafo esperado

Crea `outputs.tf`.

### 27.1. Resultados

```hcl
output "bucket_name" {
  value = aws_s3_bucket.lab.bucket
}

output "publication_keys" {
  value = {
    configuration = aws_s3_object.configuration.key
    instructions  = aws_s3_object.instructions.key
    manifest      = aws_s3_object.manifest.key
    ready         = aws_s3_object.ready.key
  }
}
```

### 27.2. Relación conceptual

```text
Bucket → Configuración ─┐
Bucket → Instrucciones ─┴→ Manifiesto → Marcador
```

El marcador también utiliza directamente el bucket.

---

## 28. Sesión 1: revisar antes de aplicar

Duración orientativa: 20 minutos.

### 28.1. Preparación

```bash
terraform init
terraform fmt -recursive
terraform validate
terraform plan -out=planes/create.tfplan
```

### 28.2. Recursos esperados

El plan inicial debe crear cinco recursos.

Un bucket y cuatro objetos.

### 28.3. Revisión

Identifica cada referencia entre recursos.

Después identifica la única dependencia explícita del ejemplo principal.

### 28.4. Entregable

Dibuja el grafo antes de ejecutar la aplicación.

---

## 29. Sesión 2: aplicar y observar

El objetivo es relacionar el grafo con las operaciones.

### 29.1. Aplicación

```bash
terraform apply planes/create.tfplan
```

### 29.2. Observación

El bucket debe completarse antes de crear sus objetos.

Configuración e instrucciones pueden procesarse concurrentemente.

El manifiesto necesita las operaciones relacionadas con ambos documentos.

El marcador espera al manifiesto.

### 29.3. Precaución

No deduzcas relaciones nuevas por el orden casual de los mensajes.

### 29.4. Entregable

Compara el dibujo previo con las restricciones observadas.

---

## 30. Sesión 3: verificar los objetos

Comprueba el resultado mediante AWS CLI.

### 30.1. Nombre del bucket

```bash
BUCKET="$(terraform output -raw bucket_name)"
```

### 30.2. Listar claves

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3api list-objects-v2 \
  --bucket "$BUCKET" \
  --query 'Contents[].Key' \
  --output json
```

### 30.3. Resultado esperado

Debes encontrar configuración, instrucciones, manifiesto y marcador.

La presencia del marcador no sustituye revisar los demás objetos.

---

## 31. Sesión 4: verificar el manifiesto

Descarga y examina los documentos.

### 31.1. Descargas

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3 cp "s3://${BUCKET}/manifest.json" descargas/manifest.json

aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3 cp "s3://${BUCKET}/config/settings.json" descargas/settings.json

aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3 cp "s3://${BUCKET}/docs/README.txt" descargas/README.txt
```

### 31.2. Consulta

```bash
jq '.' descargas/manifest.json
jq '.' descargas/settings.json
```

### 31.3. Entregable

Comprueba que las claves del manifiesto corresponden a los objetos existentes.

---

## 32. Sesión 5: modificar documentos

Las dependencias no equivalen a cambios automáticos en todos los consumidores.

### 32.1. Cambio

Modifica el contenido de `instructions`.

Genera otro plan:

```bash
terraform plan -out=planes/update.tfplan
```

### 32.2. Resultado esperado

Cambian el documento y el manifiesto que incorpora su hash.

El marcador puede permanecer sin cambios porque sus argumentos son iguales.

### 32.3. Lección

`depends_on` organiza operaciones.

No obliga a recrear o actualizar un recurso cuyos argumentos no cambian.

### 32.4. Aplicación

Revisa y aplica el plan para comprobar el resultado.

---

## 33. Límites del marcador READY

Este ejemplo ilustra orden, no un protocolo completo de publicación.

### 33.1. Primera creación

El marcador se publica después del manifiesto.

### 33.2. Actualizaciones posteriores

El marcador existente no desaparece automáticamente mientras se actualizan documentos.

### 33.3. Consecuencia

Un consumidor no puede interpretar su presencia como exclusión mutua o atomicidad.

### 33.4. Diseño real

Una publicación robusta puede necesitar versiones, rutas inmutables y una referencia final al conjunto publicado.

### 33.5. Idea esencial

No atribuyas al grafo garantías que pertenecen al diseño de la aplicación.

---

## 34. Sesión 6: inspeccionar el grafo

Terraform puede generar una representación DOT.

### 34.1. Comando

```bash
terraform graph > planes/dependencies.dot
```

### 34.2. Lectura

Abre el archivo con un editor.

Busca nombres de recursos y conexiones.

### 34.3. Renderizado opcional

Si tienes Graphviz:

```bash
dot -Tsvg planes/dependencies.dot -o planes/dependencies.svg
```

### 34.4. Precaución

Las flechas DOT pueden representar “depende de”, no la convención temporal de nuestros dibujos.

Revisa la orientación antes de interpretar el gráfico.

---

## 35. Sesión 7: mover bloques entre archivos

La organización visual no debe cambiar la infraestructura.

### 35.1. Actividad

Mueve el bloque `ready` a `00-ready.tf`.

Mueve el bucket a `99-bucket.tf`.

No dupliques los bloques.

### 35.2. Comprobaciones

```bash
terraform fmt
terraform validate
terraform plan
```

### 35.3. Resultado esperado

No deberían aparecer cambios remotos por mover las declaraciones.

### 35.4. Entregable

Explica por qué el marcador no pasa a crearse primero.

---

## 36. Fuentes de datos y dependencias

Una fuente de datos consulta información mediante un proveedor.

### 36.1. Ejemplo opcional

Añade `data.tf`:

```hcl
data "aws_s3_bucket" "published" {
  bucket = aws_s3_bucket.lab.bucket

  # La consulta forma parte del paso posterior a la publicación.
  depends_on = [aws_s3_object.ready]
}
```

### 36.2. Efecto

Si las dependencias tienen cambios pendientes, la lectura puede diferirse al apply.

### 36.3. Advertencia

Esto puede producir más valores desconocidos durante el plan.

Añade la dependencia solo si ese orden de consulta es realmente necesario.

---

## 37. Sesión 8: observar una lectura diferida

Esta ampliación no crea un recurso remoto gestionado adicional.

### 37.1. Output opcional

```hcl
output "published_bucket_arn" {
  value = data.aws_s3_bucket.published.arn
}
```

### 37.2. Provocar cambio

Modifica temporalmente el contenido de `ready`.

Genera un plan y observa la fuente de datos.

### 37.3. Entregable

Identifica si Terraform indica que la lectura ocurrirá durante la aplicación.

### 37.4. Restauración

Restaura el marcador y elimina la ampliación si no deseas conservarla.

---

## 38. Dependencias entre módulos

Las referencias a outputs conectan consumidores con resultados de módulos.

### 38.1. Ejemplo conceptual

```hcl
module "storage" {
  source = "./modules/storage"
}

module "consumer" {
  source = "./modules/consumer"

  bucket_name = module.storage.bucket_name
}
```

### 38.2. Preferencia

Publica resultados específicos y utiliza esas referencias.

### 38.3. Dependencia amplia

Un `depends_on = [module.storage]` puede involucrar muchos elementos internos.

No lo añadas cuando la referencia específica ya representa la necesidad.

---

## 39. Outputs como contratos de preparación

Un módulo puede publicar un resultado con una dependencia operativa documentada.

### 39.1. Ejemplo conceptual dentro de un módulo

```hcl
output "published_bucket_name" {
  value = aws_s3_bucket.lab.bucket

  depends_on = [
    aws_s3_object.ready
  ]
}
```

### 39.2. Uso

Un consumidor referencia ese output.

### 39.3. Advertencia

El contrato debe explicar qué significa “publicado”.

No significa automáticamente que una aplicación esté sana ni que futuras actualizaciones sean atómicas.

---

## 40. Ciclos y errores frecuentes

Una dependencia circular impide construir un orden válido.

### 40.1. Ejemplo conceptual

```text
Recurso A depende de B.
Recurso B depende de A.
```

### 40.2. Diagnóstico

Busca referencias directas e indirectas a través de locales y outputs.

### 40.3. Solución

Separa responsabilidades y elimina relaciones conceptualmente incorrectas.

### 40.4. Qué no hacer

No intentes corregir el ciclo renombrando archivos o reduciendo paralelismo.

### 40.5. Otros errores

Evita cadenas en `depends_on` y dependencias masivas sin justificación.

---

## 41. Orden de destrucción y reemplazos

Las relaciones también influyen en operaciones de eliminación.

### 41.1. Destrucción

Los dependientes deben eliminarse antes de sus dependencias cuando corresponda.

En el laboratorio, los objetos se eliminan antes del bucket.

### 41.2. Reemplazos

Un reemplazo introduce operaciones adicionales en el grafo.

No debe interpretarse como una simple actualización.

### 41.3. Regla

Revisa el plan completo cuando cambie la identidad del bucket.

### 41.4. Precaución

`create_before_destroy` no hace posible una coexistencia que el servicio prohíbe.

---

## 42. Limpieza del laboratorio

Mantén LocalStack activo durante la eliminación.

### 42.1. Plan revisable

```bash
terraform plan -destroy -out=planes/destroy.tfplan
terraform show planes/destroy.tfplan
```

### 42.2. Aplicación y verificación

```bash
terraform apply planes/destroy.tfplan
terraform state list
aws --endpoint-url=http://localhost:4566 --region us-east-1 s3api list-buckets
```

### 42.3. Finalizar

```bash
docker compose down
rm -f planes/*.tfplan
```

Borrar el estado o apagar el contenedor no sustituye esta destrucción.

---

## 43. Diferencias respecto a AWS real y ejercicios

El grafo es transferible; el comportamiento del servicio requiere revisión.

### 43.1. Diferencias relevantes

LocalStack puede simplificar permisos, tiempos y restricciones.

No reproduce todas las condiciones de AWS.

Las opciones locales del proveedor no son una configuración de producción.

### 43.2. Ejercicios

1. Añade otro documento al manifiesto.
2. Dibuja las nuevas relaciones.
3. Elimina una dependencia redundante.
4. Explica la limitación del marcador en actualizaciones.
5. Observa una lectura diferida de una fuente de datos.
6. Describe el orden de destrucción.

### 43.3. Entrega

Incluye configuración, versiones y explicaciones, sin estados ni planes sensibles.

---

## 44. Resumen y comprobación final

Las dependencias expresan necesidades reales, no preferencias de orden visual.

### 44.1. Ideas esenciales

- Utiliza referencias para relaciones de datos.
- Utiliza `depends_on` para requisitos ocultos bien justificados.
- No confundas valores iguales con recursos relacionados.
- No dependas del nombre de los archivos.
- Conserva paralelismo cuando las operaciones sean independientes.
- Revisa los efectos sobre consultas y valores desconocidos.
- Verifica disponibilidad fuera del grafo.
- Destruye con el servicio todavía disponible.

### 44.2. Idea final

Una configuración correcta no fuerza a Terraform a ejecutar una lista arbitraria.

Describe las relaciones necesarias para que Terraform pueda organizar las operaciones con claridad, revisión y un alcance controlado.