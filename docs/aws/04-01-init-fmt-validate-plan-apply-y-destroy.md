# Terraform: `init`, `fmt`, `validate`, `plan`, `apply` y `destroy`

Terraform utiliza varios comandos para preparar, revisar y ejecutar una configuración.

Cada comando cumple una responsabilidad diferente.

Aprender su secuencia permite trabajar con más seguridad y diagnosticar errores sin improvisar.

En esta lección recorrerás el ciclo completo de un proyecto.

Prepararás el entorno, crearás recursos, modificarás su configuración y eliminarás el laboratorio.

La plataforma de referencia será AWS.

Los recursos se ejecutarán únicamente en S3 emulado mediante LocalStack.

> **Curso de Terraform para AWS.**
>
> Los ejemplos utilizan credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Revisa siempre el plan antes de aplicar o destruir.

---

## 1. Objetivos de aprendizaje

Esta lección combina conceptos operativos y sesiones de terminal.

### 1.1. Conocimientos principales

Al finalizar podrás:

- Explicar la responsabilidad de cada comando.
- Inicializar un directorio de trabajo.
- Aplicar formato consistente.
- Validar una configuración.
- Generar e interpretar un plan.
- Aplicar cambios previamente revisados.
- Verificar recursos fuera de Terraform.
- Destruir una infraestructura de práctica.
- Reconocer errores de configuración y conectividad.
- Comprender la función del estado y del archivo de bloqueo.

### 1.2. Resultado práctico

Crearás un bucket S3 y un objeto de texto.

Modificarás etiquetas y contenido sin cambiar sus nombres.

Después generarás un plan de destrucción y comprobarás la limpieza.

---

## 2. Requisitos previos

Necesitas un equipo con las herramientas del curso instaladas.

### 2.1. Herramientas

Comprueba:

```bash
terraform version
docker version
docker compose version
aws --version
```

El laboratorio utiliza:

- Terraform 1.6 o superior dentro de la serie 1.x.
- Un proveedor AWS de la serie 5.x.
- Docker Compose.
- AWS CLI.
- Una imagen de LocalStack validada para S3.

### 2.2. Conocimientos recomendados

Debes reconocer variables, recursos, locales y outputs.

Los comandos de terminal utilizan una shell compatible con Bash.

Terraform y AWS CLI se ejecutan en el host.

---

## 3. Versiones y reproducibilidad

La reproducibilidad requiere controlar herramientas y dependencias.

### 3.1. Decisiones del laboratorio

La serie 5.x del proveedor AWS se utiliza como base didáctica.

No representa una recomendación de versión más reciente.

El docente debe seleccionar una combinación concreta de Terraform, proveedor y LocalStack.

### 3.2. Qué registrar

Incluye en tu entrega:

- Versión de Terraform.
- Versión seleccionada del proveedor.
- Imagen o digest de LocalStack.
- Versión de AWS CLI.
- Sistema operativo.

### 3.3. Comprobación de compatibilidad

Antes de distribuir la práctica, verifica creación, consulta, actualización y eliminación de S3.

Una configuración escrita no equivale a una combinación de versiones probada.

---

## 4. Visión general del ciclo de trabajo

Los comandos forman un flujo, pero no son intercambiables.

### 4.1. Responsabilidades

| **Comando** | **Responsabilidad** | **¿Modifica recursos?** |
|-------------|---------------------|-------------------------|
| `init` | Preparar backend, módulos y proveedores | No crea los recursos declarados |
| `fmt` | Ajustar formato | No |
| `validate` | Comprobar consistencia de configuración | No |
| `plan` | Calcular acciones propuestas | No aplica esas acciones |
| `apply` | Ejecutar acciones | Sí |
| `destroy` | Eliminar recursos gestionados | Sí |

El efecto concreto de cada ejecución depende de sus opciones y del contexto.

### 4.2. Secuencia recomendada

```text
Preparar → Inicializar → Formatear → Validar
                                   ↓
Verificar ← Aplicar ← Revisar ← Planificar
    ↓
Planificar destrucción → Revisar → Destruir
```

---

## 5. Configuración, estado y objetos remotos

Terraform compara distintas fuentes de información.

### 5.1. Configuración

Los archivos `.tf` describen el resultado deseado.

Los archivos `.tfvars` proporcionan entradas.

### 5.2. Estado

El estado relaciona direcciones de Terraform con objetos gestionados.

En este laboratorio se almacena localmente.

### 5.3. Objetos remotos

Los buckets y objetos existen dentro de LocalStack.

No existen dentro del archivo de estado.

### 5.4. Consecuencia práctica

Borrar el estado no elimina los recursos.

Apagar LocalStack tampoco constituye una destrucción gestionada por Terraform.

Mantén separadas estas responsabilidades.

---

## 6. Preparación del directorio

Trabaja en una carpeta exclusiva para esta lección.

### 6.1. Crear el proyecto

```bash
mkdir -p terraform-ciclo-localstack
cd terraform-ciclo-localstack
```

### 6.2. Estructura prevista

```text
terraform-ciclo-localstack/
├── compose.yaml
├── .env
├── .gitignore
├── versions.tf
├── providers.tf
├── variables.tf
├── terraform.tfvars
├── locals.tf
├── main.tf
└── outputs.tf
```

Todos los comandos posteriores se ejecutan desde este directorio.

No reutilices un estado de otra práctica.

---

## 7. Control de archivos

Algunos archivos deben conservarse y otros requieren protección.

### 7.1. Archivo `.gitignore`

```gitignore
.terraform/
*.tfstate
*.tfstate.*
*.tfplan
crash.log
.env
descargas/
```

### 7.2. Qué versionar

Versiona la configuración y los valores ficticios del laboratorio.

Versiona también `.terraform.lock.hcl` en el proyecto raíz.

### 7.3. Qué no publicar

No publiques estados, planes guardados ni credenciales reales.

Un plan puede contener valores sensibles aunque la terminal los oculte.

La carpeta `.terraform/` se puede reconstruir mediante inicialización.

---

## 8. Selección de la imagen de LocalStack

La práctica debe utilizar una imagen conocida por el grupo.

### 8.1. Valor proporcionado por el docente

Sustituye el marcador por una referencia real validada:

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

No continúes manteniendo el marcador.

Puede utilizarse una etiqueta fija o un digest.

### 8.2. Evitar cambios inesperados

No utilices una etiqueta flotante sin documentar sus consecuencias.

Dos alumnos con imágenes diferentes pueden observar resultados distintos.

### 8.3. Alcance

Solo necesitaremos operaciones básicas de S3.

No se requiere montar el socket de Docker para estos recursos.

---

## 9. Configuración de Docker Compose

Publicaremos el servicio únicamente en la interfaz local.

### 9.1. Archivo `compose.yaml`

```yaml
services:
  localstack:
    image: ${LOCALSTACK_IMAGE:?Define LOCALSTACK_IMAGE en .env}
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: s3
      AWS_DEFAULT_REGION: us-east-1
```

### 9.2. Arranque

```bash
docker compose up -d
docker compose ps
```

### 9.3. Diagnóstico inicial

```bash
docker compose logs --tail=100 localstack
```

Que un contenedor aparezca iniciado no garantiza que S3 esté listo.

La siguiente sección comprobará el servicio.

---

## 10. Credenciales y conectividad inicial

AWS CLI utilizará valores ficticios en la terminal actual.

### 10.1. Variables de entorno

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
```

### 10.2. Comprobar S3

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3api list-buckets
```

La respuesta puede contener una lista vacía.

Espera y repite si el servicio todavía está arrancando.

### 10.3. Condición para continuar

No ejecutes el despliegue hasta recibir una respuesta válida.

Una conexión fallida no es un error de sintaxis HCL.

---

## 11. Restricciones de Terraform y proveedor

Crea el archivo `versions.tf`.

### 11.1. Configuración

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

### 11.2. Interpretación

`required_version` limita las versiones de Terraform aceptadas.

No instala Terraform.

`required_providers` declara origen y compatibilidad del proveedor.

### 11.3. Selección concreta

La restricción permite versiones 5.x del proveedor.

El archivo de bloqueo registra la selección concreta realizada durante `init`.

---

## 12. Configuración del proveedor local

Crea el archivo `providers.tf`.

### 12.1. Configuración

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

### 12.2. Alcance del endpoint

Solo S3 está redirigido mediante esta configuración.

No añadas otros servicios sin revisar sus endpoints.

La configuración del proveedor no configura un backend S3.

---

## 13. Variables del laboratorio

Crea el archivo `variables.tf`.

### 13.1. Entradas

```hcl
variable "suffix" {
  description = "Identificador ficticio del alumno."
  type        = string
  nullable    = false

  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.suffix))
    error_message = "Usa entre 4 y 8 caracteres alfanuméricos."
  }
}

variable "owner" {
  description = "Responsable ficticio del laboratorio."
  type        = string
  default     = "formacion"
}

variable "document_content" {
  description = "Texto del objeto README.txt."
  type        = string
  default     = "Primera versión del laboratorio."
}
```

Las entradas controlan nombres, etiquetas y contenido.

---

## 14. Valores, locales y recursos

Crea los siguientes archivos.

### 14.1. `terraform.tfvars`

```hcl
suffix           = "alumno01"
owner            = "equipo-docente"
document_content = "Primera versión del laboratorio."
```

### 14.2. `locals.tf`

```hcl
locals {
  bucket_name = "curso-ciclo-dev-${var.suffix}"
}
```

### 14.3. `main.tf`

```hcl
resource "aws_s3_bucket" "lab" {
  bucket        = local.bucket_name
  force_destroy = true
  tags          = { Owner = var.owner, Laboratory = "LocalStack" }
}

resource "aws_s3_object" "readme" {
  bucket       = aws_s3_bucket.lab.id
  key          = "README.txt"
  content      = var.document_content
  content_type = "text/plain"
}
```

---

## 15. Salidas y revisión inicial

Crea el archivo `outputs.tf`.

### 15.1. Resultados

```hcl
output "bucket_name" {
  description = "Nombre del bucket del laboratorio."
  value       = aws_s3_bucket.lab.bucket
}

output "object_key" {
  description = "Clave del documento."
  value       = aws_s3_object.readme.key
}
```

### 15.2. Revisión por parejas

Una persona identifica el endpoint.

La otra comprueba credenciales y recursos.

### 15.3. Advertencia de limpieza

`force_destroy = true` permite eliminar contenido del bucket.

Se utiliza únicamente para datos ficticios del laboratorio.

---

## 16. Comando `terraform init`

La inicialización prepara el directorio para trabajar con Terraform.

### 16.1. Ejecución

```bash
terraform init
```

### 16.2. Qué prepara

Según la configuración, puede:

- Inicializar el backend.
- Descargar módulos.
- Instalar proveedores.
- Crear o actualizar el archivo de bloqueo.

### 16.3. Qué no hace

No crea el bucket ni el objeto declarados.

No sustituye la revisión del plan.

### 16.4. Resultado esperado

La salida debe indicar que el directorio se ha inicializado correctamente.

---

## 17. Cuándo repetir `init`

La inicialización puede ejecutarse varias veces.

### 17.1. Situaciones habituales

Repite `init` cuando:

- Añadas módulos.
- Cambies requisitos de proveedores.
- Cambies la configuración del backend.
- Reconstruyas el directorio de trabajo.

### 17.2. Actualización deliberada

```bash
terraform init -upgrade
```

Esta opción permite reconsiderar versiones dentro de las restricciones.

No la utilices por costumbre antes de cada plan.

### 17.3. Backend

`-reconfigure` y `-migrate-state` responden a necesidades distintas.

No pruebes migraciones sobre el laboratorio sin preparar antes una copia y un procedimiento.

---

## 18. Archivo de bloqueo de proveedores

El archivo de bloqueo ayuda a conservar selecciones reproducibles.

### 18.1. Archivo generado

```text
.terraform.lock.hcl
```

### 18.2. Información principal

Incluye selecciones de versiones y comprobaciones de integridad de proveedores.

No fija automáticamente las versiones de todos los módulos remotos.

### 18.3. Comprobación

```bash
terraform providers
```

Consulta también la versión seleccionada en el archivo de bloqueo.

### 18.4. Buena práctica

Revisa los cambios del archivo durante actualizaciones.

No lo elimines como solución inicial a cualquier error.

Un cambio de proveedor merece pruebas del ciclo completo.

---

## 19. Comando `terraform fmt`

`fmt` aplica el formato canónico de Terraform.

### 19.1. Ejecución

```bash
terraform fmt -recursive
```

### 19.2. Qué modifica

Puede ajustar:

- Indentación.
- Espaciado.
- Alineación.
- Presentación de determinadas expresiones.

### 19.3. Qué no comprueba

No demuestra que un argumento exista en el proveedor.

No comprueba conectividad.

No valida permisos remotos.

### 19.4. Recomendación

Ejecuta formato antes de revisar diferencias en Git.

---

## 20. Formato en modo comprobación

En una automatización puede ser preferible no modificar archivos.

### 20.1. Comando

```bash
terraform fmt -check -diff -recursive
```

### 20.2. Interpretación

`-check` devuelve un resultado no satisfactorio cuando el formato necesita cambios.

`-diff` muestra las diferencias propuestas.

### 20.3. Sesión breve

Desalinea varios argumentos de `main.tf`.

Ejecuta el modo comprobación.

Después ejecuta `terraform fmt -recursive`.

### 20.4. Entregable

Guarda un ejemplo de diferencia y explica por qué el formato no equivale a validación.

---

## 21. Comando `terraform validate`

La validación comprueba la consistencia de la configuración.

### 21.1. Ejecución

```bash
terraform validate
```

### 21.2. Qué puede detectar

- Referencias incorrectas.
- Argumentos no admitidos.
- Tipos incompatibles.
- Bloques mal utilizados.
- Configuración estructuralmente inválida.

### 21.3. Qué no garantiza

No garantiza que LocalStack esté disponible.

No confirma permisos ni disponibilidad de nombres remotos.

### 21.4. Requisito práctico

Inicializa antes para disponer de los esquemas de proveedores necesarios.

---

## 22. Validación y entradas concretas

Validar la configuración no sustituye un plan con valores reales.

### 22.1. Distinción

`validate` analiza la configuración reutilizable.

`plan` evalúa una ejecución concreta con sus entradas y contexto.

### 22.2. Prueba

Introduce temporalmente:

```hcl
suffix = "ALUMNO"
```

Ejecuta:

```bash
terraform plan -input=false
```

La validación de la variable debe rechazar el valor.

### 22.3. Restauración

Devuelve el sufijo a `alumno01`.

No continúes con una entrada inválida.

---

## 23. Comando `terraform plan`

El plan calcula acciones para aproximar la infraestructura a la configuración.

### 23.1. Ejecución exploratoria

```bash
terraform plan -input=false
```

### 23.2. Qué utiliza

Terraform considera:

- Configuración.
- Valores de entrada.
- Estado existente.
- Información obtenida mediante proveedores.

### 23.3. Refresco habitual

En un plan normal, Terraform suele leer los recursos existentes antes de calcular cambios.

### 23.4. Qué no hace

No ejecuta las acciones de creación, actualización o destrucción propuestas.

Sí puede realizar consultas al servicio.

---

## 24. Cómo leer las acciones del plan

No te limites a la última línea.

### 24.1. Símbolos habituales

| **Símbolo** | **Significado** | **Revisión necesaria** |
|-------------|-----------------|------------------------|
| `+` | Crear | Identidad y argumentos |
| `~` | Actualizar | Atributos modificados |
| `-` | Destruir | Datos y dependencias |
| `-/+` | Destruir y reemplazar | Riesgo de interrupción |
| `+/-` | Crear reemplazo antes de destruir | Compatibilidad del recurso |
| `<=` | Leer una fuente de datos | Información consultada |

Los símbolos ayudan, pero no sustituyen el detalle.

### 24.2. Plan inicial

Con esta configuración debes observar dos recursos nuevos.

Si aparece una destrucción, detente e investiga el estado utilizado.

---

## 25. Guardar y revisar un plan

Un plan guardado permite aplicar la propuesta concreta revisada.

### 25.1. Generación

```bash
terraform plan -input=false -out=create.tfplan
```

### 25.2. Consulta

```bash
terraform show create.tfplan
```

### 25.3. Protección

El archivo no es un documento de texto.

Puede contener datos sensibles.

No lo publiques en Git.

### 25.4. Límites

Un plan guardado no impide que el entorno remoto cambie.

Si el estado cambia, Terraform puede rechazarlo como obsoleto.

---

## 26. Códigos de salida de `plan`

La opción detallada permite distinguir cambios de errores.

### 26.1. Comando

```bash
terraform plan -input=false -detailed-exitcode
PLAN_EXIT=$?
printf 'Código: %s\n' "$PLAN_EXIT"
```

Este ejemplo presupone que la shell no está terminando automáticamente ante códigos no nulos.

### 26.2. Interpretación

- `0`: ejecución correcta sin diferencias.
- `1`: error.
- `2`: ejecución correcta con diferencias.

### 26.3. Advertencia

El código `2` no debe tratarse como un error de Terraform.

En scripts con `set -e`, captura el resultado dentro de una condición.

---

## 27. Comando `terraform apply`

La aplicación ejecuta las acciones necesarias.

### 27.1. Sin plan guardado

```bash
terraform apply
```

Terraform genera un plan y solicita confirmación.

Revisa el contenido antes de escribir `yes`.

### 27.2. Con plan guardado

```bash
terraform apply create.tfplan
```

Terraform aplica ese plan sin otra aprobación interactiva.

### 27.3. Valores de entrada

No utilices `-var` o `-var-file` para modificar un plan guardado durante su aplicación.

Genera un nuevo plan si cambian las entradas.

---

## 28. Aplicación y fallos parciales

Terraform no ofrece una transacción global con reversión automática.

### 28.1. Ejemplo de situación

El bucket puede crearse y el objeto puede fallar.

La aplicación termina con error, pero el bucket existe.

### 28.2. Qué hacer

1. Lee el primer error.
2. Consulta el estado.
3. Verifica LocalStack.
4. Corrige la causa.
5. Genera otro plan.

### 28.3. Qué evitar

No repitas `apply` sin comprender el fallo.

No borres el estado para “empezar limpio”.

Podrías perder el seguimiento de recursos ya creados.

---

## 29. Sesión práctica 1: creación completa

Duración orientativa: 25 minutos.

### 29.1. Secuencia

```bash
terraform init
terraform fmt -recursive
terraform validate
terraform plan -input=false -out=create.tfplan
terraform show create.tfplan
terraform apply create.tfplan
```

### 29.2. Resultado esperado

La aplicación debe crear dos recursos.

Un bucket y un objeto.

### 29.3. Consultar outputs

```bash
terraform output
```

### 29.4. Entregable

Registra la función de cada comando y las acciones revisadas.

---

## 30. Sesión práctica 2: verificación independiente

Verifica el servicio mediante AWS CLI.

### 30.1. Recuperar nombre

```bash
BUCKET="$(terraform output -raw bucket_name)"
mkdir -p descargas
```

### 30.2. Consultar y descargar

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3api head-bucket --bucket "$BUCKET"

aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  s3 cp "s3://${BUCKET}/README.txt" descargas/README.txt
```

### 30.3. Leer

```bash
cat descargas/README.txt
```

Un output registrado no sustituye esta comprobación remota.

---

## 31. Sesión práctica 3: comprobar convergencia

Después de aplicar, un nuevo plan debería reflejar estabilidad.

### 31.1. Comando

```bash
terraform plan -input=false
```

### 31.2. Resultado esperado

Sin cambios externos ni de configuración, Terraform debe indicar que no hay acciones pendientes.

### 31.3. Si aparecen cambios

Revisa:

- Archivos modificados.
- Variables de entorno.
- Recursos alterados externamente.
- Comportamiento del proveedor.
- Persistencia de LocalStack.

### 31.4. Entregable

Explica por qué repetir un plan no debería crear otro bucket idéntico.

---

## 32. Sesión práctica 4: actualización controlada

Cambia contenido y una etiqueta sin modificar nombres.

### 32.1. Nuevos valores

En `terraform.tfvars`:

```hcl
suffix           = "alumno01"
owner            = "nuevo-equipo"
document_content = "Segunda versión del laboratorio."
```

### 32.2. Plan y aplicación

```bash
terraform plan -input=false -out=update.tfplan
terraform show update.tfplan
terraform apply update.tfplan
```

### 32.3. Verificación

Descarga otra vez el documento y consulta las etiquetas.

### 32.4. Entregable

Identifica qué cambió en cada recurso y confirma que el bucket conserva su nombre.

---

## 33. Sesión práctica 5: observar un reemplazo

Algunos atributos no pueden modificarse en el mismo objeto remoto.

### 33.1. Cambio temporal

Modifica el sufijo:

```hcl
suffix = "alumno02"
```

### 33.2. Observación

```bash
terraform plan -input=false
```

El nombre del bucket cambia.

El proveedor debe planificar su reemplazo.

El objeto también necesita una relación válida con el nuevo bucket.

### 33.3. No aplicar

Restaura `alumno01`.

Genera otro plan y comprueba que desaparece el reemplazo.

---

## 34. Sesión práctica 6: detectar un error de configuración

Esta práctica distingue formato y validación.

### 34.1. Cambio incorrecto

Añade temporalmente dentro del bucket:

```hcl
nombre = "argumento-no-admitido"
```

### 34.2. Comprobaciones

```bash
terraform fmt
terraform validate
```

El formato puede completarse.

La validación debe rechazar el argumento.

### 34.3. Restauración

Elimina el argumento incorrecto y repite la validación.

### 34.4. Entregable

Explica por qué un archivo formateado puede seguir siendo inválido.

---

## 35. Sesión práctica 7: detectar conectividad fallida

Esta práctica no modifica la configuración.

### 35.1. Detener temporalmente

```bash
docker compose stop localstack
```

### 35.2. Comparar

```bash
terraform validate
terraform plan -input=false
```

La validación puede terminar correctamente.

El plan puede fallar al intentar consultar los recursos existentes.

### 35.3. Recuperar servicio

```bash
docker compose start localstack
```

Comprueba S3 antes de continuar.

No presupongas que todos los modos de arranque conservan recursos.

---

## 36. Deriva y refresco

La deriva es una diferencia causada fuera de la configuración gestionada.

### 36.1. Ejemplo

Una persona modifica una etiqueta mediante AWS CLI.

La configuración de Terraform conserva el valor anterior.

### 36.2. Plan normal

Un plan normal puede detectar la diferencia y proponer restaurar el valor declarado.

### 36.3. Refresco exclusivo

```bash
terraform plan -refresh-only
```

Este modo propone actualizar la visión del estado.

No propone restaurar los recursos conforme a la configuración.

### 36.4. Precaución

Revisa el objetivo antes de elegir el modo.

Refrescar estado y corregir deriva no son la misma operación.

---

## 37. Opciones que requieren criterio

Algunas opciones reducen protecciones o cambian el alcance habitual.

### 37.1. Aprobación automática

```bash
terraform apply -auto-approve
```

Elimina la confirmación interactiva.

No elimina el riesgo de las acciones.

### 37.2. Alcance parcial

`-target` es una herramienta para situaciones excepcionales.

No debe convertirse en la forma habitual de desplegar una parte del proyecto.

### 37.3. Sin refresco

`-refresh=false` puede calcular cambios con información desactualizada.

### 37.4. Regla

No añadas opciones para evitar entender un error o una diferencia.

---

## 38. Bloqueo del estado e interrupciones

El bloqueo ayuda a evitar escrituras concurrentes.

### 38.1. Buenas prácticas

No ejecutes dos aplicaciones simultáneas sobre el mismo estado.

No utilices `-lock=false` como solución habitual.

### 38.2. Espera de bloqueo

Cuando el backend lo permite, puedes ajustar la espera:

```bash
terraform apply -lock-timeout=60s
```

### 38.3. Interrupción

Terraform intenta detenerse de forma ordenada ante una interrupción.

Un cierre forzado puede dejar acciones incompletas.

### 38.4. Recuperación

Verifica procesos activos, estado y recursos antes de continuar.

---

## 39. Comando `terraform destroy`

La destrucción elimina los recursos gestionados por el estado actual.

### 39.1. Ejecución interactiva

```bash
terraform destroy
```

Terraform presenta un plan de destrucción y solicita confirmación.

### 39.2. Alcance

No elimina automáticamente todos los recursos del emulador.

Elimina los objetos gestionados que forman parte de la operación.

### 39.3. Advertencia

La destrucción puede borrar datos.

En este laboratorio los datos son ficticios.

### 39.4. Condición

LocalStack debe seguir disponible para procesar las llamadas de eliminación.

---

## 40. Plan de destrucción guardado

Una revisión separada también es útil para eliminar recursos.

### 40.1. Generación

```bash
terraform plan -destroy -input=false -out=destroy.tfplan
```

### 40.2. Revisión

```bash
terraform show destroy.tfplan
```

### 40.3. Aplicación

```bash
terraform apply destroy.tfplan
```

### 40.4. Resultado esperado

Deben eliminarse el objeto y el bucket.

La dependencia permite ordenar las acciones adecuadamente.

Un plan guardado de destrucción tampoco solicita otra confirmación interactiva.

---

## 41. Verificación de limpieza

Comprueba la eliminación antes de apagar el emulador.

### 41.1. Consulta local

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3api list-buckets
```

### 41.2. Estado

```bash
terraform state list
```

No deberían aparecer los dos recursos destruidos.

### 41.3. Plan posterior

Un plan normal volverá a proponer creación porque la configuración sigue declarando los recursos.

Esto es esperado.

### 41.4. Finalizar

```bash
docker compose down
rm -f create.tfplan update.tfplan destroy.tfplan
```

---

## 42. Diferencias respecto a AWS real

El ciclo de comandos es transferible, pero el entorno no es equivalente.

### 42.1. Aspectos transferibles

- Inicialización.
- Formato.
- Validación.
- Lectura de planes.
- Gestión del estado.
- Aplicación y destrucción.

### 42.2. Aspectos que cambian

Debes revisar credenciales, IAM, costes, límites y disponibilidad.

Las opciones `skip_*` pertenecen a la configuración local.

### 42.3. Persistencia

Si LocalStack pierde recursos, el estado puede conservar sus referencias.

### 42.4. Producción

Una prueba local no demuestra seguridad ni compatibilidad completa de una arquitectura real.

---

## 43. Evaluación y ejercicios

La evaluación debe comprobar comprensión, no solo ejecución de comandos.

### 43.1. Ejercicios

1. Explica por qué `init` no crea el bucket.
2. Provoca un cambio de formato y corrígelo.
3. Provoca un argumento inválido y diagnostícalo.
4. Guarda un plan y describe sus acciones.
5. Actualiza el contenido del objeto.
6. Observa un reemplazo sin aplicarlo.
7. Destruye y verifica la limpieza.

### 43.2. Evidencias

Entrega configuración, versiones y registro de resultados.

### 43.3. Criterio principal

Debes poder justificar por qué ejecutas cada comando.

No entregues estados ni planes guardados.

---

## 44. Resumen y lista final

El ciclo de Terraform separa preparación, revisión y ejecución.

### 44.1. Antes de aplicar

Comprueba directorio, estado, endpoint, credenciales y entradas.

Ejecuta formato y validación.

Genera y revisa el plan.

### 44.2. Después de aplicar

Consulta outputs y verifica el servicio.

Genera otro plan para comprobar estabilidad.

### 44.3. Antes de destruir

Comprueba el alcance y los datos que se eliminarán.

Mantén el servicio remoto disponible.

### 44.4. Idea final

Trabajar con Terraform no consiste en ejecutar comandos de memoria.

Consiste en comprender qué información utiliza cada operación, qué cambios propone y qué evidencia confirma su resultado.