# Estructura de un proyecto Terraform con LocalStack emulando AWS

> Curso de Terraform con LocalStack emulando servicios de AWS.
> Los ejemplos y las prácticas de esta lección se ejecutan localmente.
> No necesitas una cuenta de AWS para completar el laboratorio.
> Utiliza exclusivamente credenciales ficticias y endpoints locales.
> Una prueba satisfactoria en LocalStack no equivale a validar AWS real.

Un proyecto Terraform es más que un conjunto de archivos con extensión `.tf`.
También incluye decisiones sobre entradas, dependencias, estado, documentación y procedimientos de trabajo.
Su estructura debe permitir entender qué se gestiona y repetir las operaciones con seguridad.
En esta lección construirás un proyecto pequeño, organizado y verificable.

El laboratorio utilizará un bucket S3 dentro de LocalStack.
Docker Compose gestionará el servicio de emulación.
Terraform gestionará el bucket.
AWS CLI aportará una comprobación independiente.

Primero organizaremos el módulo raíz.
Después estudiaremos qué archivos se comparten y cuáles permanecen locales.
Finalmente practicaremos cambios de estructura y una introducción a módulos reutilizables.

---

## 1. Objetivos de aprendizaje

La unidad combina organización de archivos y ejecución de un proyecto real de práctica.

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Definir qué es un módulo raíz.
- Diferenciar archivos de configuración y archivos generados.
- Explicar cómo Terraform interpreta los archivos de un directorio.
- Distinguir configuración, estado y recursos existentes.
- Reconocer el papel del archivo de bloqueo.

### 1.2. Objetivos prácticos

También podrás:

- Crear una estructura de proyecto.
- Separar versiones, providers, variables, recursos y salidas.
- Ejecutar Terraform desde el directorio correcto.
- Verificar recursos mediante AWS CLI.
- Documentar entradas y procedimientos.
- Limpiar los recursos antes de retirar LocalStack.

---

## 2. Alcance de la lección

Trabajaremos con una estructura sencilla y una ampliación opcional.

### 2.1. Laboratorio principal

El proyecto incluirá:

- Un archivo de Docker Compose.
- Un módulo raíz dentro de `infra/`.
- Un bucket S3.
- Variables de entrada.
- Valores locales.
- Salidas.
- Documentación y evidencias.

### 2.2. Ampliación

Introduciremos un módulo hijo local.
La ampliación será un refactor de estructura, no otro laboratorio independiente.
Utilizaremos un bloque `moved` para preservar la relación de gestión.
No aplicaremos cambios si aparece un reemplazo inesperado.

### 2.3. Exclusiones

No configuraremos AWS real, backends remotos ni un sistema corporativo de despliegue.

---

## 3. Requisitos previos

Comprueba las herramientas antes de crear archivos.

### 3.1. Conocimientos necesarios

Debes saber:

- Abrir una terminal Bash.
- Crear directorios.
- Editar texto.
- Arrancar Docker Compose.
- Identificar un endpoint local.
- Interpretar un plan básico.

### 3.2. Comprobaciones

```bash
terraform version
docker version
docker compose version
aws --version
```

### 3.3. Condición del entorno

Docker debe poder comunicarse con su servidor.
AWS CLI debe corresponder a la versión requerida por el curso.
Terraform debe cumplir las restricciones del proyecto.
El docente debe probar la combinación antes de impartir la práctica.

---

## 4. Versiones y reproducibilidad

Una estructura clara también conserva decisiones sobre dependencias.

### 4.1. Información que debes registrar

Anota:

- Terraform CLI.
- Provider de AWS.
- Docker.
- Docker Compose.
- AWS CLI.
- Imagen de LocalStack.
- Sistema y arquitectura.

### 4.2. Referencias didácticas

La configuración permitirá Terraform desde 1.6 y anterior a 2.0.
El provider de AWS se limitará a la serie 5.
Estas restricciones son una base del ejemplo, no una declaración de versiones actuales.
La referencia de LocalStack la proporcionará el docente.

### 4.3. Actualizaciones

No actualices herramientas durante una comparación sin registrarlo.
Una actualización puede modificar planes y comportamientos.
Repite las comprobaciones relevantes cuando cambie una dependencia.

---

## 5. Qué es un proyecto Terraform

Un proyecto reúne configuración y procedimientos para gestionar un alcance concreto.

### 5.1. Componentes habituales

Puede incluir:

- Módulos.
- Entradas.
- Providers.
- Recursos.
- Salidas.
- Estado.
- Documentación.
- Automatización auxiliar.

### 5.2. Alcance de gestión

El proyecto debe explicar qué recursos pretende gestionar.
También debe aclarar qué recursos quedan fuera.
La carpeta no determina automáticamente la propiedad de todos los objetos de un servicio.
La relación de gestión depende de configuración y estado.

### 5.3. Idea esencial

**La estructura organiza la intención; no sustituye los controles operativos.**

---

## 6. Qué es un módulo

Un módulo es un conjunto de archivos de configuración Terraform en un directorio.

### 6.1. Módulo raíz

El módulo raíz es el directorio desde el que Terraform evalúa la configuración principal.
En este laboratorio será `infra/`.
Allí estarán las variables, el provider y el recurso principal.
La raíz del repositorio y el módulo raíz no tienen que ser el mismo directorio.

### 6.2. Módulo hijo

Un módulo hijo se incorpora mediante un bloque `module`.
Puede estar en otro directorio local.
También puede proceder de una fuente remota compatible.
Su código no se incluye por aparecer debajo de la carpeta del proyecto.

### 6.3. Organización frente a inclusión

Crear `modules/bucket/` no activa ese módulo.
Debe existir una llamada explícita.
Esta distinción evita confundir jerarquía de carpetas con ejecución.
La ampliación final mostrará esa relación.

---

## 7. Cómo Terraform lee los archivos

Terraform interpreta conjuntamente los archivos de configuración del módulo.

### 7.1. Archivos habituales

Las extensiones de configuración incluyen:

- `.tf`.
- `.tf.json`.

Los archivos HCL del ejemplo utilizarán `.tf`.
Los archivos de variables tendrán otro papel.

### 7.2. El nombre no establece orden

`providers.tf` no se ejecuta antes que `main.tf` por su nombre.
`01-recursos.tf` tampoco fuerza una primera creación.
Los nombres ayudan a las personas.
Las dependencias se expresan mediante referencias y otros mecanismos de Terraform.

### 7.3. Directorios hijos

Terraform no recorre todos los subdirectorios buscando recursos para incorporarlos.
Un subdirectorio necesita una llamada de módulo para formar parte de esa configuración.
Esta regla será importante al separar código reutilizable.

---

## 8. Convenciones de nombres

Las convenciones deben facilitar lectura y mantenimiento.

### 8.1. Convenciones del laboratorio

Utilizaremos:

- `versions.tf` para restricciones.
- `providers.tf` para conexión.
- `variables.tf` para entradas.
- `locals.tf` para valores derivados.
- `main.tf` para el recurso.
- `outputs.tf` para salidas.

### 8.2. Lo que no son

Estos nombres no son un formulario obligatorio.
Puedes organizar proyectos complejos por servicio o responsabilidad.
Lo importante es evitar duplicaciones y ambigüedades.
La estructura debe corresponder al tamaño real del proyecto.

### 8.3. Regla práctica

No crees diez archivos vacíos para una configuración de cinco líneas.
Tampoco concentres un proyecto grande sin separación comprensible.
Elige una organización que permita revisar cambios.

---

## 9. Arquitectura del laboratorio

Separaremos herramientas y configuración de infraestructura.

### 9.1. Recorrido de solicitudes

```text
Repositorio
├── compose.yaml ── Docker Compose ── LocalStack
└── infra/
    └── Terraform ── Provider AWS ── API local de S3

AWS CLI ──────────────────────────── API local de S3
```

### 9.2. Contextos de ejecución

Docker Compose se ejecutará desde la raíz del repositorio.
Terraform evaluará `infra/`.
AWS CLI se ejecutará en el anfitrión.
LocalStack escuchará mediante el puerto local publicado.

### 9.3. Endpoint

Utilizaremos `http://localhost:4566`.
Si cambias el puerto, actualiza los clientes.
Si ejecutas Terraform dentro de un contenedor, revisa el significado de `localhost`.

---

## 10. Estructura inicial del repositorio

La estructura diferencia entorno, infraestructura y documentación.

### 10.1. Árbol previsto

```text
estructura-terraform/
├── README.md
├── compose.yaml
├── .env
├── .env.example
├── .gitignore
├── infra/
│   ├── versions.tf
│   ├── providers.tf
│   ├── variables.tf
│   ├── locals.tf
│   ├── main.tf
│   └── outputs.tf
└── docs/
    ├── decisiones.md
    └── evidencias/
        └── registro.md
```

### 10.2. Criterio

El árbol describe una organización recomendada, no una exigencia universal.

---

## 11. Crear directorios

Prepara las carpetas antes de añadir contenido.

### 11.1. Comandos Bash

```bash
mkdir -p ~/cursos/terraform/estructura-terraform/infra
mkdir -p ~/cursos/terraform/estructura-terraform/docs/evidencias

cd ~/cursos/terraform/estructura-terraform
```

### 11.2. Confirmar ubicación

```bash
pwd
ls -la
```

### 11.3. Por qué importa

Los comandos relativos dependen del directorio actual.
Un error de ubicación puede afectar a otro proyecto.
No copies estados para corregir una carpeta equivocada.
Comprueba siempre dónde trabajas.

### 11.4. Evidencia

Anota la ruta del repositorio y la ruta del módulo raíz.
No incluyas información personal innecesaria en un registro compartido.

---

## 12. Configuración local de Compose

La imagen se seleccionará mediante una variable del entorno de Compose.

### 12.1. Archivo `.env.example`

```dotenv
COMPOSE_PROJECT_NAME=aula-estructura
LOCALSTACK_IMAGE=localstack/localstack:ETIQUETA_PROBADA
```

### 12.2. Archivo `.env`

Copia el ejemplo:

```bash
cp .env.example .env
```

Después sustituye `ETIQUETA_PROBADA`.
Utiliza la referencia autorizada por el curso.
No ejecutes el laboratorio conservando el marcador.
No cambies a `latest` para evitar una selección explícita.

### 12.3. Secretos

Esta configuración no necesita claves reales.
Si la modalidad requiere autenticación, utiliza un procedimiento autorizado.
No publiques tokens en los archivos del ejemplo.

---

## 13. Archivo `compose.yaml`

Compose gestionará únicamente el entorno de emulación.

### 13.1. Contenido

```yaml
services:
  localstack:
    image: "${LOCALSTACK_IMAGE:?Define LOCALSTACK_IMAGE en .env}"
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: s3,sts
      AWS_DEFAULT_REGION: us-east-1
```

### 13.2. Decisiones

No montamos el socket de Docker.
No configuramos persistencia explícita.
No publicamos el puerto en todas las interfaces.
No declaramos servicios ajenos al ejercicio.

### 13.3. Compatibilidad

El docente debe comprobar la imagen y las variables admitidas.
Declarar `SERVICES` no demuestra compatibilidad completa.
La prueba funcional se realizará después del arranque.

---

## 14. Restricciones en `versions.tf`

Las dependencias deben ser visibles en el módulo raíz.

### 14.1. Archivo `infra/versions.tf`

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

### 14.2. Interpretación

`required_version` limita Terraform CLI.
`source` identifica el provider.
`~> 5.0` permite versiones compatibles de la serie 5.
No fija exactamente la versión 5.0.0.

### 14.3. Selección efectiva

La inicialización seleccionará una versión.
El archivo de bloqueo conservará esa selección para el proyecto.

---

## 15. Entradas en `variables.tf`

Las variables describen qué puede proporcionar quien utiliza el módulo.

### 15.1. Archivo `infra/variables.tf`

```hcl
variable "bucket_name" {
  description = "Nombre del bucket local del laboratorio."
  type        = string
  default     = "aula-estructura-terraform-001"
}

variable "localstack_endpoint" {
  description = "Endpoint local utilizado por el provider."
  type        = string
  default     = "http://localhost:4566"
}

variable "environment" {
  description = "Etiqueta de entorno para la práctica."
  type        = string
  default     = "local"
}
```

### 15.2. Diseño

Cada entrada tiene nombre, tipo y descripción.
Los valores predeterminados permiten ejecutar el laboratorio sin archivos adicionales.

---

## 16. Validación de entradas

Las validaciones pueden detectar valores no adecuados antes de operar.

### 16.1. Ejemplo opcional

Dentro de `bucket_name`, puedes añadir:

```hcl
validation {
  condition = can(regex(
    "^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$",
    var.bucket_name
  ))
  error_message = "Usa de 3 a 63 caracteres: minusculas, numeros y guiones."
}
```

### 16.2. Alcance

La expresión acepta un subconjunto sencillo de nombres.
No reproduce todas las reglas de S3.
La API puede rechazar un valor que supere esta comprobación.
La validación local no sustituye la validación del servicio.

### 16.3. Ejercicio

Prueba un nombre con mayúsculas.
Observa el error durante una evaluación que utilice las entradas.
Restablece un valor válido antes de continuar.

---

## 17. Conexión en `providers.tf`

El provider define cómo se realizan solicitudes a la API.

### 17.1. Archivo `infra/providers.tf`

```hcl
provider "aws" {
  region     = "us-east-1"
  access_key = "test"
  secret_key = "test"

  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_region_validation      = true
  skip_requesting_account_id  = true
  s3_use_path_style           = true

  endpoints {
    s3  = var.localstack_endpoint
    sts = var.localstack_endpoint
  }
}
```

### 17.2. Seguridad

Las credenciales son ficticias.
Las opciones `skip_*` no son un cortafuegos.
Añadir otros servicios exige revisar sus endpoints.
No copies este bloque como configuración de AWS real.

---

## 18. Valores derivados en `locals.tf`

Los valores locales ayudan a evitar repeticiones internas.

### 18.1. Archivo `infra/locals.tf`

```hcl
locals {
  common_tags = {
    Curso     = "Terraform"
    Entorno   = var.environment
    Unidad    = "EstructuraProyecto"
    Gestion   = "Terraform"
  }
}
```

### 18.2. Diferencia frente a variables

Una variable es una entrada del módulo.
Un valor local es una expresión interna con nombre.
No se proporciona directamente mediante `-var`.
Puede utilizar entradas y otros valores disponibles.

### 18.3. Criterio

Utiliza valores locales cuando mejoren legibilidad.
No conviertas cada literal en un local sin necesidad.
La abstracción debe facilitar comprensión, no esconder información sencilla.

---

## 19. Recursos en `main.tf`

El módulo raíz declarará un único bucket.

### 19.1. Archivo `infra/main.tf`

```hcl
resource "aws_s3_bucket" "laboratorio" {
  bucket        = var.bucket_name
  force_destroy = false

  tags = local.common_tags
}
```

### 19.2. Lectura

`aws_s3_bucket` identifica el tipo.
`laboratorio` es la etiqueta local.
`bucket` configura el nombre en S3.
`tags` utiliza un mapa definido en `locals.tf`.

### 19.3. Dirección

```text
aws_s3_bucket.laboratorio
```

### 19.4. Limpieza

`force_destroy = false` no impide destruir un bucket vacío.
Evita solicitar su vaciado automático mediante este recurso.

---

## 20. Resultados en `outputs.tf`

Las salidas exponen información seleccionada del módulo.

### 20.1. Archivo `infra/outputs.tf`

```hcl
output "bucket_name" {
  description = "Nombre del bucket gestionado."
  value       = aws_s3_bucket.laboratorio.bucket
}

output "bucket_arn" {
  description = "ARN informado para el bucket."
  value       = aws_s3_bucket.laboratorio.arn
}
```

### 20.2. Diseño

Expón información útil para comprobaciones o consumidores.
No publiques todos los atributos sin una necesidad concreta.
Las salidas pueden contener información sensible.
Marcar una salida como sensible no elimina necesariamente su valor del estado.

### 20.3. Límite

Consultar una salida no sustituye una consulta independiente a la API.

---

## 21. Archivos de valores de entrada

Los archivos `.tfvars` proporcionan valores para variables del módulo raíz.

### 21.1. Ejemplo compartible

Puedes crear `infra/terraform.tfvars.example`:

```hcl
bucket_name = "aula-estructura-equipo-001"
environment = "local"
```

### 21.2. Activarlo deliberadamente

El archivo de ejemplo no se carga automáticamente.
Puedes copiarlo a un archivo local:

```bash
cp infra/terraform.tfvars.example infra/practica.tfvars
```

### 21.3. Uso explícito

```bash
terraform -chdir=infra plan -var-file=practica.tfvars
```

### 21.4. Regla

Las rutas del ejemplo se evalúan desde el módulo indicado con `-chdir`.

---

## 22. Carga automática y precedencia

La forma de nombrar un archivo puede cambiar cuándo se utiliza.

### 22.1. Archivos cargados automáticamente

Terraform reconoce:

- `terraform.tfvars`.
- `terraform.tfvars.json`.
- Archivos terminados en `.auto.tfvars`.
- Archivos terminados en `.auto.tfvars.json`.

### 22.2. Otros archivos

`practica.tfvars` requiere `-var-file`.
`terraform.tfvars.example` sirve de documentación.
No lo trates como una entrada activa.

### 22.3. Precedencia resumida

Los valores predeterminados pueden ser sustituidos por entradas.
Los archivos automáticos pueden sustituir valores de variables de entorno.
Las opciones explícitas `-var` y `-var-file` tienen prioridad posterior.
El orden de esas opciones importa.

### 22.4. Recomendación

Evita fuentes contradictorias y registra qué entrada utilizaste.

---

## 23. Proteger el repositorio

La configuración compartida debe separarse de archivos locales y sensibles.

### 23.1. Archivo `.gitignore`

```gitignore
.env
**/.terraform/
*.tfstate
*.tfstate.*
*.tfplan
*.tfvars
*.tfvars.json
crash.log
crash.*.log
override.tf
override.tf.json
*_override.tf
*_override.tf.json
```

### 23.2. Precaución

Los ejemplos terminados en `.example` no coinciden con todas estas exclusiones.
Revisa su contenido antes de compartirlo.
Un archivo ignorado puede seguir registrado si se añadió anteriormente.

---

## 24. Archivos generados por Terraform

La ejecución añade elementos que no escribiste manualmente.

### 24.1. Elementos habituales

La tabla distingue responsabilidades.

| **Elemento** | **Función** | **Tratamiento habitual** |
|--------------|-------------|---------------------------|
| `.terraform/` | Datos locales de inicialización | No versionar |
| `.terraform.lock.hcl` | Selección y verificación de providers | Versionar |
| `terraform.tfstate` | Seguimiento de recursos | Proteger, no publicar |
| Plan guardado | Operaciones propuestas y datos asociados | Proteger |

El estado y los planes pueden contener información sensible.

### 24.2. Archivo de bloqueo

Debe permanecer junto al módulo raíz.
No bloquea automáticamente Terraform CLI.
Tampoco fija módulos remotos o la imagen de LocalStack.

### 24.3. Regla

No edites el estado manualmente para corregir errores de estructura.

---

## 25. Arrancar y comprobar LocalStack

Antes de Terraform, verifica la API del laboratorio.

### 25.1. Arranque

Desde la raíz del repositorio:

```bash
docker compose config --quiet
docker compose pull
docker compose up -d
docker compose ps
```

### 25.2. Observación

```bash
docker compose logs --tail=100 localstack
docker compose port localstack 4566
```

### 25.3. Interpretación

Un contenedor en ejecución es una primera evidencia.
No demuestra que S3 responda.
La consulta funcional se realizará con AWS CLI.
No continúes si el puerto o la imagen son inesperados.

---

## 26. Preparar AWS CLI para verificar

La consulta independiente utilizará credenciales ficticias.

### 26.1. Función Bash

```bash
aws_local() {
  AWS_ACCESS_KEY_ID=test \
  AWS_SECRET_ACCESS_KEY=test \
  AWS_SESSION_TOKEN= \
  AWS_PROFILE= \
  AWS_CONFIG_FILE=/dev/null \
  AWS_SHARED_CREDENTIALS_FILE=/dev/null \
  AWS_EC2_METADATA_DISABLED=true \
  aws \
    --endpoint-url http://localhost:4566 \
    --region us-east-1 \
    --no-cli-pager \
    "$@"
}
```

### 26.2. Consulta inicial

```bash
aws_local s3api list-buckets
```

### 26.3. Alcance

La función no constituye aislamiento general de red.

---

## 27. Ejecutar Terraform desde el directorio correcto

Utilizaremos `-chdir` para mantener visible el módulo raíz.

### 27.1. Inicialización

```bash
terraform -chdir=infra init
```

### 27.2. Formato y validación

```bash
terraform -chdir=infra fmt
terraform -chdir=infra validate
```

### 27.3. Planificación

```bash
terraform -chdir=infra plan
```

### 27.4. Interpretación

`-chdir=infra` cambia el directorio de trabajo de Terraform.
El estado local y el archivo de bloqueo estarán normalmente allí.
Compose seguirá utilizándose desde la raíz del repositorio.
No alternes comandos sin registrar su contexto.

---

## 28. Aplicar y verificar

El primer plan debe limitarse al bucket del ejercicio.

### 28.1. Aplicación revisada

```bash
terraform -chdir=infra apply
```

Lee la propuesta antes de confirmar.
No utilices `-auto-approve`.
Si elegiste un archivo de variables, mantén esa selección también al aplicar.

### 28.2. Consultas

```bash
terraform -chdir=infra output
terraform -chdir=infra state list

aws_local s3api head-bucket \
  --bucket aula-estructura-terraform-001
```

### 28.3. Resultado

El nombre debe corresponder a la entrada efectiva.
Adapta la consulta si cambiaste esa entrada.
La salida y la API aportan evidencias diferentes.

---

## 29. Documentación en `README.md`

El README debe permitir entender y ejecutar el proyecto.

### 29.1. Contenido mínimo

Incluye:

- Objetivo.
- Arquitectura.
- Requisitos.
- Imagen probada.
- Preparación.
- Entradas.
- Ejecución.
- Verificación.
- Limpieza.
- Limitaciones.

### 29.2. Ejemplo de instrucción

Escribe desde qué directorio se ejecuta cada bloque.
Indica qué marcador debe sustituirse.
No presupongas archivos que no entregas.
No afirmes validación en AWS real.

### 29.3. Criterio

Una documentación ejecutable es más útil que una descripción general extensa.

---

## 30. Registrar decisiones de estructura

`docs/decisiones.md` conservará los motivos de organización.

### 30.1. Ejemplo de decisión

```markdown
## Separación de Compose e infraestructura

Decisión:
Compose se mantiene en la raíz y Terraform en infra/.

Motivo:
Distinguir el servicio local de los recursos gestionados.

Consecuencia:
Se utiliza terraform -chdir=infra en las instrucciones.
```

### 30.2. Otras decisiones

Documenta:
- Convenciones de nombres.
- Política de variables.
- Archivos versionados.
- Tratamiento de evidencias.

### 30.3. Regla

Registra decisiones relevantes, no cada edición menor.

---

## 31. Refactor dentro del mismo módulo

Puedes reorganizar archivos sin cambiar la dirección del recurso.

### 31.1. Ejercicio

Mueve el bloque del bucket de `main.tf` a `storage.tf`.
No dupliques el bloque.
Mantén tipo y etiqueta del recurso.

### 31.2. Comprobar

```bash
terraform -chdir=infra fmt
terraform -chdir=infra validate
terraform -chdir=infra plan
```

### 31.3. Resultado esperado

No deberían proponerse cambios de infraestructura por mover el bloque.
Los archivos siguen perteneciendo al mismo módulo.
El nombre del archivo no forma parte de la dirección del recurso.

### 31.4. Precaución

Un recurso duplicado puede producir errores de configuración.
Restablece la organización acordada antes de la ampliación.

---

## 32. Introducción a un módulo hijo

La ampliación separará la implementación del bucket.

### 32.1. Nueva estructura

```text
infra/
├── main.tf
├── providers.tf
├── versions.tf
├── variables.tf
├── locals.tf
├── outputs.tf
├── migrations.tf
└── modules/
    └── bucket/
        ├── versions.tf
        ├── variables.tf
        ├── main.tf
        └── outputs.tf
```

### 32.2. Condición

Realiza esta ampliación después de comprobar el laboratorio principal.
No copies el estado dentro del módulo hijo.

---

## 33. Entradas y dependencias del módulo hijo

El módulo debe declarar lo que necesita.

### 33.1. `infra/modules/bucket/versions.tf`

```hcl
terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}
```

### 33.2. `infra/modules/bucket/variables.tf`

```hcl
variable "bucket_name" {
  type        = string
  description = "Nombre del bucket."
}

variable "tags" {
  type        = map(string)
  description = "Etiquetas del recurso."
}
```

### 33.3. Diseño

El módulo no declarará credenciales ni endpoints propios.

---

## 34. Implementación del módulo hijo

La responsabilidad interna será crear un bucket.

### 34.1. `infra/modules/bucket/main.tf`

```hcl
resource "aws_s3_bucket" "this" {
  bucket        = var.bucket_name
  force_destroy = false
  tags          = var.tags
}
```

### 34.2. `infra/modules/bucket/outputs.tf`

```hcl
output "bucket_name" {
  value = aws_s3_bucket.this.bucket
}

output "bucket_arn" {
  value = aws_s3_bucket.this.arn
}
```

### 34.3. Límite

El módulo expone una interfaz pequeña.
Su carpeta no crea un estado independiente al llamarse desde el módulo raíz.

---

## 35. Llamada desde el módulo raíz

Sustituiremos el recurso directo por una llamada.

### 35.1. Nuevo `infra/main.tf`

```hcl
module "bucket" {
  source = "./modules/bucket"

  bucket_name = var.bucket_name
  tags        = local.common_tags
}
```

### 35.2. Actualizar `infra/outputs.tf`

```hcl
output "bucket_name" {
  value = module.bucket.bucket_name
}

output "bucket_arn" {
  value = module.bucket.bucket_arn
}
```

### 35.3. Provider

El módulo hijo utilizará la configuración predeterminada de AWS heredada.
La conexión seguirá definida en el módulo raíz.

---

## 36. Preservar la relación mediante `moved`

Cambiar de módulo cambia la dirección del recurso.

### 36.1. Archivo `infra/migrations.tf`

```hcl
moved {
  from = aws_s3_bucket.laboratorio
  to   = module.bucket.aws_s3_bucket.this
}
```

### 36.2. Comprobaciones

```bash
terraform -chdir=infra init
terraform -chdir=infra validate
terraform -chdir=infra plan
```

### 36.3. Resultado esperado

Terraform debe reconocer el traslado de dirección.
No deberían aparecer destrucción y creación del bucket por este refactor.
Si aparecen, detente y revisa nombres, entradas y movimiento.
Aplica únicamente después de comprender el plan.

### 36.4. Política

Conserva el bloque de migración según la política del proyecto.

---

## 37. Sesión práctica A: construir el proyecto

La primera sesión trabaja organización y ejecución.

### 37.1. Duración y objetivo

Duración orientativa: 45 minutos.
Objetivo: preparar y ejecutar un módulo raíz organizado.

### 37.2. Actividades

1. Crea las carpetas.
2. Añade Compose y variables locales.
3. Escribe los archivos Terraform.
4. Arranca LocalStack.
5. Inicializa y valida.
6. Revisa el plan.
7. Aplica y consulta S3.

### 37.3. Entregable

Entrega el árbol de archivos y las evidencias.
Explica qué contiene cada archivo.
Distingue archivos escritos y generados.
No entregues estados ni secretos.

---

## 38. Sesión práctica B: reorganizar sin cambiar recursos

La segunda sesión compara organización y comportamiento.

### 38.1. Duración y objetivo

Duración orientativa: 25 minutos.
Objetivo: demostrar que mover un bloque entre archivos del mismo módulo no impone cambios.

### 38.2. Actividades

Consulta el estado.
Mueve el bloque a `storage.tf`.
Valida.
Genera un plan.
Compara direcciones.
Restablece o documenta la nueva organización.

### 38.3. Revisión por parejas

Una persona modifica.
La otra comprueba ausencia de duplicaciones.
Ambas interpretan el plan.
La conclusión debe citar el resultado observado.

### 38.4. Entregable

Entrega una explicación de cinco líneas con una limitación.

---

## 39. Sesión práctica C: extraer un módulo hijo

La tercera sesión introduce una migración de dirección revisada.

### 39.1. Duración y objetivo

Duración orientativa: 40 minutos.
Objetivo: extraer el bucket sin reemplazarlo.

### 39.2. Actividades

Crea el módulo hijo.
Actualiza la llamada y las salidas.
Añade `moved`.
Inicializa.
Genera un plan.
Revisa por parejas.
Aplica y verifica.

### 39.3. Evidencias

Conserva la dirección anterior y la nueva.
Comprueba que el nombre del bucket no cambió.
Explica el papel del estado.

### 39.4. Criterio

Un reemplazo inesperado impide considerar terminado el refactor.

---

## 40. Errores frecuentes y diagnóstico

Los errores de estructura deben investigarse antes de aplicar.

### 40.1. Tabla orientativa

| **Síntoma** | **Comprobación inicial** | **Qué evitar** |
|-------------|--------------------------|----------------|
| Sin configuración | Directorio y `-chdir` | Copiar estados |
| Bloque duplicado | Archivos del módulo | Aplicar igualmente |
| Variable desconocida | Declaración y ámbito | Inventar valores |
| Módulo no instalado | `source` e inicialización | Borrar todo |
| Reemplazo inesperado | Dirección y `moved` | Confirmar automáticamente |

La tabla orienta la investigación.
No confirma causas por sí sola.

### 40.2. Procedimiento

Registra el mensaje saneado.
Identifica el comando.
Comprueba el directorio.
Formula una hipótesis.
Cambia una condición relevante.
Repite y compara.

---

## 41. Limpieza del laboratorio

La limpieza debe realizarse con LocalStack disponible.

### 41.1. Revisar y destruir

```bash
terraform -chdir=infra plan -destroy
terraform -chdir=infra destroy
```

### 41.2. Comprobar

```bash
terraform -chdir=infra state list
aws_local s3api list-buckets
```

### 41.3. Retirar Compose

Si la instancia es exclusiva del proyecto:

```bash
docker compose down
```

### 41.4. Precaución

Detener el contenedor no equivale a destruir recursos mediante Terraform.
No borres el estado para ocultar una limpieza fallida.

---

## 42. Diferencias respecto a AWS real

La estructura puede reutilizar ideas, pero la conexión real exige otros controles.

### 42.1. Límites del laboratorio

LocalStack no reproduce necesariamente:
- Permisos completos.
- Cuotas.
- Costes.
- Rendimiento.
- Disponibilidad.
- Todos los comportamientos S3.

### 42.2. Transición futura

AWS real requiere identidad, permisos y autorización.
También necesita control de costes y procedimientos de limpieza.
No consiste simplemente en eliminar los endpoints.
Las credenciales reales no deben escribirse en los archivos del ejemplo.

### 42.3. Estado compartido

Un backend remoto exige una unidad específica.
Separar carpetas no resuelve automáticamente colaboración y bloqueo.
Los workspaces tampoco deben tratarse como una barrera universal de seguridad.

---

## 43. Evaluación y registro de aprendizaje

La evaluación combina organización, resultados y explicación.

### 43.1. Rúbrica inicial

| **Criterio** | **0 puntos** | **1 punto** | **2 puntos** |
|-------------|--------------|-------------|-------------|
| Estructura | Confusa | Parcialmente clara | Responsabilidades separadas |
| Ejecución | No completa | Requiere ajustes | Funcional y verificada |
| Refactor | Cambios no entendidos | Explicación parcial | Direcciones preservadas |
| Seguridad | Incumple límites | Cumplimiento parcial | Controles y limpieza |
| Documentación | No reproducible | Faltan datos | Entradas y evidencias claras |

La puntuación máxima es diez.
Un fallo crítico no queda compensado por una puntuación alta.

### 43.2. Registro mínimo

Conserva versiones, rutas, entradas, comandos y resultados.
Añade errores, decisiones, limpieza y limitaciones.
No publiques secretos ni estados reales.

---

## 44. Resumen y siguientes pasos

La estructura del proyecto debe hacer visible la intención y facilitar la revisión.

### 44.1. Ideas esenciales

- El módulo raíz no tiene que ser la raíz del repositorio.
- Los archivos `.tf` del módulo se interpretan conjuntamente.
- Sus nombres no establecen el orden de ejecución.
- Un módulo hijo necesita una llamada explícita.
- Variables, locales y salidas cumplen funciones diferentes.
- El estado y los planes requieren protección.
- El archivo de bloqueo debe conservarse.
- Un refactor puede necesitar una migración de dirección.

### 44.2. Continuación del curso

Las siguientes unidades pueden desarrollar expresiones, tipos y dependencias.
Después conviene estudiar módulos, backends y colaboración.
Cada ampliación debe conservar procedimientos de verificación.

### 44.3. Cierre

**Organiza para comprender, verifica para confiar y documenta para repetir.**
Una estructura útil permite explicar qué cambiará antes de ejecutar Terraform.