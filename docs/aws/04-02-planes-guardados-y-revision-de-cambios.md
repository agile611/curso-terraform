# Planes guardados y revisión de cambios en Terraform

Un plan guardado permite separar la preparación de un cambio de su ejecución.

Primero, Terraform calcula las acciones propuestas.

Después, una persona o un proceso revisa ese resultado.

Finalmente, se aplica el archivo de plan que corresponde a la revisión.

Esta separación ayuda a trabajar con cambios identificables y auditables.

No convierte Terraform en un sistema de transacciones con reversión automática.

Tampoco garantiza que el servicio remoto permanezca sin cambios entre planificación y aplicación.

En esta lección utilizarás S3 emulado en LocalStack para practicar el ciclo completo.

> **Curso de Terraform para AWS.**
>
> Los recursos de esta página se ejecutan localmente con LocalStack.
>
> Utiliza credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.

---

## 1. Objetivos

La lección combina revisión humana, consultas JSON y ejercicios operativos.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Diferenciar un plan exploratorio de un plan guardado.
- Generar planes mediante `-out`.
- Revisar planes con `terraform show`.
- Interpretar acciones de creación, actualización y reemplazo.
- Examinar cambios utilizando `jq`.
- Aplicar el archivo que fue revisado.
- Reconocer planes obsoletos.
- Proteger los artefactos generados.

### 1.2. Resultado práctico

Crearás un bucket y un documento de texto.

Después practicarás actualizaciones, reemplazos no aplicados y destrucción controlada.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos del ciclo básico de Terraform.

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

El proveedor AWS se limita a la serie 5.x como base de compatibilidad.

### 2.2. Entorno de terminal

Los scripts utilizan Bash.

Terraform y AWS CLI se ejecutan en el host.

Las operaciones de S3 se dirigen a `http://localhost:4566`.

---

## 3. Versiones y validación del laboratorio

Una configuración escrita no equivale a una combinación de versiones probada.

### 3.1. Responsabilidad del docente

Antes de impartir la práctica, verifica:

- Creación del bucket.
- Escritura y lectura del objeto.
- Actualización de etiquetas.
- Aplicación de un plan guardado.
- Rechazo de un plan obsoleto.
- Destrucción de los recursos.

### 3.2. Registro de versiones

Conserva la versión de Terraform y el archivo de bloqueo.

Registra también la imagen o digest de LocalStack.

La serie de proveedor utilizada no pretende representar la versión más reciente.

### 3.3. Criterio de reproducibilidad

Todos los alumnos deben utilizar la combinación validada o documentar sus diferencias.

---

## 4. Plan exploratorio y plan guardado

Ambos calculan cambios, pero su uso posterior es diferente.

### 4.1. Comparación

| **Modalidad** | **Comando** | **Uso principal** |
|---------------|-------------|------------------|
| Exploratoria | `terraform plan` | Inspeccionar una propuesta |
| Guardada | `terraform plan -out=cambio.tfplan` | Conservar una propuesta aplicable |
| Consulta del artefacto | `terraform show cambio.tfplan` | Revisar el plan existente |
| Aplicación del artefacto | `terraform apply cambio.tfplan` | Ejecutar ese plan |

Un plan mostrado en terminal no se guarda automáticamente como artefacto aplicable.

### 4.2. Consecuencia

Si ejecutas `terraform apply` sin archivo, Terraform genera otro plan.

Ese segundo plan puede diferir del que observaste anteriormente.

### 4.3. Regla del curso

Cuando una revisión apruebe un artefacto, aplica ese artefacto.

---

## 5. Qué contiene un plan guardado

El archivo conserva información necesaria para ejecutar la propuesta.

### 5.1. Información incluida

Puede contener:

- La configuración utilizada.
- Valores de variables.
- Acciones propuestas.
- Información del estado.
- Datos relevantes para los proveedores.
- Valores sensibles.

### 5.2. Formato

El archivo es un artefacto opaco.

No es un documento HCL editable.

No lo modifiques manualmente.

### 5.3. Seguridad

Un plan debe tratarse como información potencialmente confidencial.

La ocultación de valores en terminal no elimina esos valores del artefacto.

---

## 6. Qué no garantiza un plan guardado

Guardar una propuesta no congela todo el entorno.

### 6.1. Límites importantes

Un plan no garantiza:

- Que el servicio remoto continúe disponible.
- Que las credenciales mantengan sus permisos.
- Que nadie modifique objetos fuera de Terraform.
- Que todas las operaciones terminen correctamente.
- Que exista reversión automática.
- Que todas las condiciones remotas puedan comprobarse durante el plan.

### 6.2. Tiempo entre revisión y aplicación

Cuanto mayor sea el intervalo, mayor es la oportunidad de divergencias.

### 6.3. Criterio operativo

Aplica planes dentro de una ventana corta y controlada.

Si cambian las condiciones relevantes, vuelve a planificar y revisar.

---

## 7. Configuración, estado y servicio remoto

La revisión debe distinguir estas tres fuentes.

### 7.1. Configuración

Los archivos `.tf` describen el resultado deseado.

Los archivos `.tfvars` proporcionan entradas.

### 7.2. Estado

El estado relaciona direcciones de Terraform con objetos gestionados.

También registra resultados y metadatos operativos.

### 7.3. Servicio remoto

En esta práctica, los objetos existen dentro de LocalStack.

No existen dentro del plan ni dentro del estado.

### 7.4. Consecuencia

Un nombre registrado no demuestra que el bucket siga disponible.

La verificación debe consultar S3.

---

## 8. Preparación del directorio

Trabaja en una carpeta independiente de otras lecciones.

### 8.1. Crear el proyecto

```bash
mkdir -p terraform-planes-localstack/planes
mkdir -p terraform-planes-localstack/descargas
cd terraform-planes-localstack
```

### 8.2. Estructura

```text
terraform-planes-localstack/
├── compose.yaml
├── .env
├── versions.tf
├── providers.tf
├── variables.tf
├── terraform.tfvars
├── locals.tf
├── main.tf
├── outputs.tf
├── planes/
└── descargas/
```

---

## 9. Protección de archivos

La configuración y los artefactos tienen necesidades diferentes.

### 9.1. Archivo `.gitignore`

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

### 9.2. Qué conservar en Git

Versiona la configuración y los valores ficticios del laboratorio.

Versiona `.terraform.lock.hcl` en el proyecto raíz.

### 9.3. Precaución

Los informes JSON también pueden contener secretos.

No protejas únicamente los archivos terminados en `.tfplan`.

---

## 10. Selección de LocalStack

El docente debe proporcionar una imagen validada para las operaciones utilizadas.

### 10.1. Referencia de imagen

Sustituye el marcador antes de ejecutar el arranque:

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 10.2. Decisión de versiones

Utiliza una etiqueta fija o un digest.

No presupongas que una etiqueta flotante mantiene el mismo comportamiento.

### 10.3. Alcance del laboratorio

Solo se necesita S3.

No se utiliza Lambda ni se requiere montar el socket de Docker.

La edición elegida debe admitir las operaciones S3 de esta práctica.

---

## 11. Configuración del emulador

Publicaremos el servicio únicamente en la interfaz local.

### 11.1. Archivo `compose.yaml`

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

### 11.2. Arranque

```bash
docker compose up -d
docker compose ps
docker compose logs --tail=100 localstack
```

### 11.3. Disponibilidad

El contenedor puede estar iniciado antes de que S3 esté listo.

Comprueba el servicio en la siguiente sección.

---

## 12. Credenciales ficticias y conexión

AWS CLI utilizará valores locales de prueba.

### 12.1. Variables de entorno

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
```

### 12.2. Consulta inicial

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3api list-buckets
```

### 12.3. Condición para continuar

Espera hasta recibir una respuesta válida.

Si falla, revisa contenedor, puerto y endpoint.

No cambies la configuración HCL para corregir un servicio que no está disponible.

---

## 13. Requisitos de Terraform

Crea el archivo `versions.tf`.

### 13.1. Configuración

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

### 13.2. Interpretación

La restricción permite proveedores AWS 5.x.

El archivo de bloqueo conserva la selección concreta.

### 13.3. Actualizaciones

No ejecutes `terraform init -upgrade` entre la aprobación y aplicación de un plan.

---

## 14. Proveedor AWS con endpoint local

Crea el archivo `providers.tf`.

### 14.1. Configuración

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

### 14.2. Alcance

Solo S3 está redirigido mediante esta configuración.

No añadas recursos de otros servicios sin revisar sus endpoints.

---

## 15. Variables del proyecto

Crea el archivo `variables.tf`.

### 15.1. Entradas

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
  type    = string
  default = "formacion"
}

variable "document_content" {
  type    = string
  default = "Version 1 del documento."
}
```

### 15.2. Uso

Estas entradas controlan identidad, etiquetas y contenido.

---

## 16. Valores iniciales y nombres

Crea los archivos de entrada y cálculo.

### 16.1. `terraform.tfvars`

```hcl
suffix           = "alumno01"
owner            = "equipo-inicial"
document_content = "Version 1 del documento."
```

### 16.2. `locals.tf`

```hcl
locals {
  bucket_name = "curso-planes-dev-${var.suffix}"

  tags = {
    Owner      = var.owner
    ManagedBy  = "Terraform"
    Laboratory = "LocalStack"
  }
}
```

### 16.3. Resultado esperado

El bucket se llamará `curso-planes-dev-alumno01`.

---

## 17. Recursos del laboratorio

Crea el archivo `main.tf`.

### 17.1. Configuración

```hcl
resource "aws_s3_bucket" "lab" {
  bucket = local.bucket_name

  # Solo para limpiar datos ficticios del laboratorio.
  force_destroy = true

  tags = local.tags
}

resource "aws_s3_object" "readme" {
  bucket       = aws_s3_bucket.lab.id
  key          = "README.txt"
  content      = var.document_content
  content_type = "text/plain"
}
```

### 17.2. Dependencia

La referencia al bucket conecta ambos recursos.

`force_destroy` no debe copiarse automáticamente a producción.

---

## 18. Outputs e inicialización

Crea `outputs.tf` y prepara el proyecto.

### 18.1. Salidas

```hcl
output "bucket_name" {
  value = aws_s3_bucket.lab.bucket
}

output "object_key" {
  value = aws_s3_object.readme.key
}

output "configured_owner" {
  value = var.owner
}
```

### 18.2. Preparación

```bash
terraform init
terraform fmt -recursive
terraform validate
```

---

## 19. Sesión 1: generar el plan inicial

Duración orientativa: 15 minutos.

### 19.1. Plan guardado

```bash
terraform plan \
  -input=false \
  -out=planes/01-create.tfplan
```

### 19.2. Resultado esperado

El resumen debería indicar dos recursos nuevos.

No deberían aparecer actualizaciones ni destrucciones.

### 19.3. Archivo generado

Comprueba su existencia:

```bash
ls -lh planes/01-create.tfplan
```

### 19.4. Entregable

Registra las direcciones que se crearán y su función.

---

## 20. Sesión 2: revisar el artefacto

La revisión debe consultar el plan existente.

### 20.1. Mostrar el plan

```bash
terraform show -no-color planes/01-create.tfplan
```

### 20.2. Informe de texto

```bash
terraform show -no-color planes/01-create.tfplan \
  > planes/01-create.txt
```

### 20.3. Qué revisar

Comprueba nombre del bucket, etiquetas, clave y contenido.

Identifica los atributos desconocidos.

### 20.4. Advertencia

El informe de texto no sustituye al archivo aplicable.

No puede utilizarse como argumento de `terraform apply`.

---

## 21. Interpretación de símbolos

Los símbolos permiten reconocer la categoría de cada acción.

### 21.1. Tabla de referencia

| **Símbolo** | **Acción** | **Pregunta de revisión** |
|-------------|------------|-------------------------|
| `+` | Crear | ¿Es el objeto esperado? |
| `~` | Actualizar | ¿Qué atributos cambian? |
| `-` | Destruir | ¿Qué datos se perderán? |
| `-/+` | Reemplazar destruyendo primero | ¿Habrá interrupción? |
| `+/-` | Reemplazar creando primero | ¿Puede coexistir el reemplazo? |
| `<=` | Leer una fuente de datos | ¿Qué información se consulta? |

El detalle del plan importa más que el símbolo aislado.

### 21.2. Valores desconocidos

`known after apply` indica información pendiente.

No significa automáticamente que exista un error.

---

## 22. Lista de revisión humana

La aprobación debe basarse en preguntas concretas.

### 22.1. Identidad y alcance

Comprueba:

- Directorio de trabajo.
- Estado seleccionado.
- Endpoint local.
- Credenciales ficticias.
- Variables utilizadas.
- Direcciones afectadas.

### 22.2. Acciones

Revisa creaciones, actualizaciones, destrucciones y reemplazos.

### 22.3. Datos

Identifica contenido almacenado y riesgo de pérdida.

### 22.4. Decisión

Si una acción no está explicada, no apruebes todavía.

---

## 23. Sesión 3: aplicar exactamente el plan

La aplicación debe utilizar el artefacto revisado.

### 23.1. Comando

```bash
terraform apply planes/01-create.tfplan
```

### 23.2. Confirmación

Terraform no solicita otra aprobación interactiva al recibir un plan guardado.

La revisión debe ocurrir antes.

### 23.3. Comprobación

```bash
terraform output
terraform state list
```

### 23.4. Regla

No sustituyas el comando por `terraform apply` sin archivo.

Eso generaría una planificación nueva.

---

## 24. Sesión 4: verificación independiente

Consulta LocalStack mediante AWS CLI.

### 24.1. Obtener datos

```bash
BUCKET="$(terraform output -raw bucket_name)"
KEY="$(terraform output -raw object_key)"
```

### 24.2. Descargar el objeto

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3 cp "s3://${BUCKET}/${KEY}" descargas/README.txt
```

### 24.3. Leer

```bash
cat descargas/README.txt
```

### 24.4. Estabilidad

Ejecuta otro plan y comprueba que no existen cambios inesperados.

---

## 25. Exportación del plan a JSON

JSON permite inspeccionar el artefacto con herramientas.

### 25.1. Generación

```bash
terraform show -json planes/01-create.tfplan \
  > planes/01-create.json
```

### 25.2. Inspección inicial

```bash
jq 'keys' planes/01-create.json
```

### 25.3. Secciones útiles

Puedes encontrar `resource_changes`, `output_changes` y `planned_values`.

También existen metadatos y representación de configuración.

### 25.4. Seguridad

El JSON puede revelar valores sensibles.

Trátalo con la misma protección que el plan.

---

## 26. Consultar acciones con `jq`

Cada cambio de recurso incluye una lista de acciones.

### 26.1. Consulta

```bash
jq -r '
  .resource_changes[]? |
  [.address, (.change.actions | join(","))] |
  @tsv
' planes/01-create.json
```

### 26.2. Resultado orientativo

```text
aws_s3_bucket.lab	create
aws_s3_object.readme	create
```

### 26.3. Interpretación

Un reemplazo puede aparecer como `delete,create` o `create,delete`.

### 26.4. Precaución

No busques únicamente una lista igual a `["delete"]`.

También debes detectar destrucciones incluidas en reemplazos.

---

## 27. Examinar valores anteriores y posteriores

La estructura del cambio permite comparar atributos.

### 27.1. Consulta por dirección

```bash
jq '
  .resource_changes[]? |
  select(.address == "aws_s3_bucket.lab") |
  .change |
  {before, after, after_unknown}
' planes/01-create.json
```

### 27.2. Creación

En una creación, `before` normalmente es nulo.

### 27.3. Valores posteriores

`after` representa valores conocidos de la propuesta.

`after_unknown` indica atributos todavía desconocidos.

### 27.4. Regla

No confundas un atributo pendiente con un valor vacío definitivo.

---

## 28. Detectar cualquier eliminación propuesta

Una consulta conservadora debe incluir los reemplazos.

### 28.1. Consulta

```bash
jq -r '
  .resource_changes[]? |
  select(.change.actions | index("delete")) |
  .address
' planes/01-create.json
```

### 28.2. Resultado esperado

El plan inicial no debería devolver direcciones.

### 28.3. Alcance

Esta consulta identifica acciones de eliminación.

No evalúa pérdida lógica de datos dentro de una actualización.

### 28.4. Ejemplo

Cambiar el contenido de un objeto puede sobrescribir información sin destruir el recurso.

---

## 29. Sesión 5: actualización revisada

Modifica únicamente propietario y contenido.

### 29.1. Nuevos valores

```hcl
suffix           = "alumno01"
owner            = "equipo-version-2"
document_content = "Version 2 del documento."
```

### 29.2. Plan

```bash
terraform plan -input=false -out=planes/02-update.tfplan
terraform show -no-color planes/02-update.tfplan
terraform show -json planes/02-update.tfplan > planes/02-update.json
```

### 29.3. Resultado esperado

El bucket conserva su nombre.

El plan actualiza etiquetas y contenido sin reemplazos esperados.

### 29.4. Aplicación

Aplica `planes/02-update.tfplan` después de revisarlo y verifica el documento.

---

## 30. Sesión 6: observar un reemplazo

Esta sesión es de revisión; no aplicaremos el cambio.

### 30.1. Plan con otro nombre

```bash
terraform plan \
  -input=false \
  -var='suffix=alumno02' \
  -out=planes/03-replace.tfplan
```

### 30.2. Consulta

```bash
terraform show -json planes/03-replace.tfplan > planes/03-replace.json
jq -r '
  .resource_changes[]? |
  select(.change.actions | index("delete")) |
  [.address, (.change.actions | join(","))] | @tsv
' planes/03-replace.json
```

### 30.3. Entregable

Explica por qué cambiar el nombre del bucket requiere reemplazo.

No apliques este artefacto.

---

## 31. Sesión 7: editar después de guardar

Un plan conserva las entradas utilizadas al generarlo.

### 31.1. Crear la propuesta

```bash
terraform plan \
  -var='document_content=Version 3 revisada.' \
  -out=planes/04-frozen.tfplan
```

### 31.2. Editar el archivo

Cambia `document_content` en `terraform.tfvars` a `Version 4 en archivos.`.

### 31.3. Aplicar el artefacto

```bash
terraform apply planes/04-frozen.tfplan
```

### 31.4. Resultado

El objeto debe contener la versión 3 planificada.

Un nuevo plan propondrá la versión 4 presente en los archivos.

---

## 32. Interpretar el experimento de entradas

El artefacto y los archivos actuales pueden expresar propuestas distintas.

### 32.1. Lo demostrado

Editar `terraform.tfvars` no modifica un plan ya creado.

### 32.2. Lo no demostrado

No significa que los archivos actuales sean irrelevantes para el proyecto.

Siguen determinando la próxima planificación.

### 32.3. Convergencia

Genera un plan nuevo para aplicar la versión 4.

Revísalo, aplícalo y verifica su contenido.

### 32.4. Limpieza de decisiones

No mantengas simultáneamente varios planes aprobados con objetivos incompatibles.

Documenta cuál queda vigente.

---

## 33. Sesión 8: generar un plan obsoleto

El objetivo es cambiar el estado después de crear otro plan.

### 33.1. Artefacto candidato

```bash
terraform plan \
  -var='owner=equipo-obsoleto' \
  -out=planes/05-stale.tfplan
```

### 33.2. Cambio posterior

```bash
terraform plan \
  -var='owner=equipo-nuevo' \
  -out=planes/06-newer.tfplan

terraform apply planes/06-newer.tfplan
```

### 33.3. Revisión

Verifica que la etiqueta `Owner` cambió.

El estado ahora incorpora una aplicación posterior.

---

## 34. Sesión 9: intentar aplicar el plan obsoleto

Esta operación debe fallar sin ejecutar la propuesta antigua.

### 34.1. Intento

```bash
terraform apply planes/05-stale.tfplan
```

### 34.2. Resultado esperado

Terraform debe rechazar el plan por un cambio posterior del estado.

La redacción exacta depende de la versión.

### 34.3. Recuperación correcta

Genera un plan nuevo desde la configuración que realmente deseas.

Revísalo antes de aplicar.

### 34.4. Qué no hacer

No edites el estado para forzar la aceptación del artefacto.

---

## 35. Plan obsoleto y deriva externa

Son situaciones relacionadas, pero no idénticas.

### 35.1. Cambio del estado

Otra aplicación de Terraform puede invalidar un plan guardado.

### 35.2. Cambio fuera de Terraform

Una modificación mediante AWS CLI puede alterar el recurso sin cambiar el estado inmediatamente.

### 35.3. Límite del artefacto

Un plan guardado no realiza una nueva planificación completa al aplicarse.

No confíes en su rechazo como detector universal de deriva externa.

### 35.4. Regla operativa

Si sabes que el servicio cambió, vuelve a planificar.

Controla también la concurrencia y la ventana de aplicación.

---

## 36. Códigos de salida en automatización

`-detailed-exitcode` distingue diferencias de errores.

### 36.1. Ejemplo seguro en Bash

```bash
if terraform plan -input=false -detailed-exitcode -out=planes/07-ci.tfplan; then
  plan_exit=0
else
  plan_exit=$?
fi

case "$plan_exit" in
  0) printf 'Sin cambios.\n' ;;
  2) printf 'Cambios pendientes de revisión.\n' ;;
  *) printf 'Plan fallido.\n' >&2; exit "$plan_exit" ;;
esac
```

### 36.2. Interpretación

El código `2` significa ejecución correcta con diferencias.

No equivale a un fallo de Terraform.

---

## 37. Control automático de eliminaciones

Una regla simple puede exigir revisión especial para acciones destructivas.

### 37.1. Exportación y control

```bash
terraform show -json planes/07-ci.tfplan > planes/07-ci.json

if jq -e '
  any(.resource_changes[]?;
      .change.actions | index("delete") != null)
' planes/07-ci.json >/dev/null; then
  printf 'Requiere aprobación destructiva.\n'
else
  printf 'No se detectaron acciones delete.\n'
fi
```

### 37.2. Límites

No detecta todos los riesgos de actualización.

No sustituye revisión de datos, permisos, alcance ni dependencias.

---

## 38. Identidad del artefacto y aprobación

La revisión necesita identificar el archivo exacto.

### 38.1. Hash en Linux

```bash
sha256sum planes/07-ci.tfplan
```

### 38.2. Hash en macOS

```bash
shasum -a 256 planes/07-ci.tfplan
```

### 38.3. Registro

Asocia el hash con revisión, fecha y responsable.

Un hash identifica contenido, pero no demuestra por sí solo quién lo aprobó.

### 38.4. Pipeline

Protege el artefacto frente a sustituciones y accesos no autorizados.

Aplica únicamente el archivo asociado a la aprobación vigente.

---

## 39. Fallos parciales y concurrencia

La aplicación no es una transacción global.

### 39.1. Fallo parcial

Algunas acciones pueden completarse antes de que otra falle.

### 39.2. Recuperación

Lee el error, consulta recursos y genera otro plan.

No presupongas que repetir el artefacto antiguo es la recuperación correcta.

### 39.3. Concurrencia

No ejecutes aplicaciones simultáneas sobre el mismo estado.

No utilices `-lock=false` para evitar comprender un bloqueo.

### 39.4. Artefactos

Un plan guardado no mantiene el estado bloqueado durante toda la revisión.

---

## 40. Plan guardado de destrucción

La eliminación también requiere una propuesta revisable.

### 40.1. Generación

```bash
terraform plan \
  -destroy \
  -input=false \
  -out=planes/08-destroy.tfplan
```

### 40.2. Revisión

```bash
terraform show -no-color planes/08-destroy.tfplan
```

### 40.3. Resultado esperado

Deben eliminarse únicamente el objeto y el bucket del laboratorio.

### 40.4. Aplicación

Ejecuta `terraform apply planes/08-destroy.tfplan` tras aprobarlo.

---

## 41. Verificación y limpieza del laboratorio

Mantén LocalStack disponible hasta terminar las eliminaciones.

### 41.1. Consulta

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  s3api list-buckets

terraform state list
```

### 41.2. Finalizar

```bash
docker compose down
rm -f planes/*.tfplan planes/*.json planes/*.txt
rm -f descargas/README.txt
```

### 41.3. Advertencia

Borrar artefactos no sustituye destruir recursos.

---

## 42. Diferencias respecto a AWS real

Los conceptos del plan son transferibles; el entorno operativo cambia.

### 42.1. Qué debes revisar

En AWS real debes considerar:

- Credenciales y permisos.
- Costes.
- Restricciones del servicio.
- Dependencias externas.
- Retención y copias de datos.
- Ventanas de mantenimiento.

### 42.2. Emulación

Una prueba local no valida toda la seguridad de una arquitectura.

Las opciones `skip_*` pertenecen a esta configuración local.

### 42.3. Persistencia

El estado y LocalStack son sistemas independientes.

---

## 43. Ejercicios y evaluación

La evaluación debe comprobar comprensión y evidencia.

### 43.1. Ejercicios

1. Genera un plan con una etiqueta nueva.
2. Identifica el cambio en JSON.
3. Detecta un reemplazo sin aplicarlo.
4. Demuestra que editar entradas no modifica un plan guardado.
5. Genera y diagnostica un plan obsoleto.
6. Registra el hash de un artefacto.
7. Destruye y verifica la limpieza.

### 43.2. Entrega

Incluye configuración, versiones y explicación de resultados.

No entregues planes, JSON completos ni estados con datos sensibles.

---

## 44. Resumen y lista final

Los planes guardados separan propuesta, revisión y ejecución.

### 44.1. Antes de aplicar

Comprueba:

- Entorno y estado correctos.
- Endpoint local.
- Acciones justificadas.
- Reemplazos identificados.
- Artefacto aprobado.
- Ausencia de cambios posteriores conocidos.

### 44.2. Después de aplicar

Verifica el servicio y comprueba convergencia con otro plan.

### 44.3. Idea principal

Aplica la propuesta que revisaste, no una propuesta nueva generada accidentalmente.

Un buen procedimiento combina artefactos protegidos, revisión explícita y comprobación del resultado.