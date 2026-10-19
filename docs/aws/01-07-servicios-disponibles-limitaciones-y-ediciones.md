# Servicios disponibles, limitaciones y ediciones de LocalStack

> Curso de Terraform con LocalStack emulando servicios de AWS.
> Todas las prácticas de esta lección se realizan en un entorno local.
> Utiliza credenciales ficticias y endpoints explícitamente locales.
> No necesitas una cuenta de AWS para completar el laboratorio principal.
> La disponibilidad de una funcionalidad depende de la versión, edición y configuración elegidas.

LocalStack permite practicar con determinadas APIs de AWS sin desplegar los recursos del ejercicio en AWS real.
Sin embargo, que un servicio aparezca en un catálogo no significa que todas sus operaciones estén implementadas.
Tampoco significa que reproduzca exactamente los permisos, tiempos, errores o garantías del servicio original.

Esta lección enseña a seleccionar servicios y comprobar su compatibilidad con tareas concretas.
Utilizaremos S3 como laboratorio principal.
SQS y DynamoDB serán ampliaciones condicionadas a la disponibilidad comprobada en el entorno del curso.

El resultado será una pequeña matriz de compatibilidad respaldada por evidencias.
La matriz distinguirá documentación consultada, operaciones ejecutadas y aspectos pendientes.
También incluirá una decisión sobre qué ejercicios pueden incorporarse al curso.

---

## 1. Objetivos de aprendizaje

Esta unidad combina selección de funcionalidades, verificación técnica y documentación responsable.

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Diferenciar servicio, operación y funcionalidad.
- Explicar qué significa cobertura de una API.
- Distinguir compatibilidad sintáctica y semántica.
- Reconocer diferencias entre versiones y ediciones.
- Separar emulación local y validación en AWS.

### 1.2. Objetivos prácticos

También podrás:

- Identificar la imagen utilizada.
- Preparar una matriz de compatibilidad.
- Ejecutar pruebas locales pequeñas.
- Clasificar errores sin inventar causas.
- Revisar un recurso de Terraform antes de aplicarlo.
- Decidir si una actividad está preparada para el alumnado.
- Registrar limitaciones y limpiar los recursos creados.

---

## 2. Alcance de la documentación

Esta página describe un procedimiento de evaluación, no un catálogo comercial permanentemente actualizado.

### 2.1. Qué incluye

Trabajaremos con:

- Identificación del entorno.
- Consulta de documentación correspondiente a la versión.
- Pruebas de operaciones concretas.
- Configuración de endpoints locales.
- Evaluación de recursos Terraform.
- Registro de resultados.
- Limpieza del laboratorio.

### 2.2. Qué no garantiza

Esta documentación no garantiza:

- Disponibilidad de todos los servicios de AWS.
- Igualdad completa entre LocalStack y AWS.
- Compatibilidad con cualquier imagen.
- Acceso a funcionalidades de cualquier edición.
- Reproducción íntegra de IAM.
- Rendimiento representativo de producción.

### 2.3. Regla principal

Una afirmación de compatibilidad debe indicar **qué operación se probó y bajo qué condiciones**.

---

## 3. Requisitos previos

Comprueba que el entorno de las unidades anteriores está preparado.

### 3.1. Conocimientos necesarios

Debes saber:

- Crear y editar archivos.
- Ejecutar comandos en Bash.
- Arrancar Docker Compose.
- Interpretar un endpoint.
- Configurar credenciales ficticias.
- Leer un plan básico de Terraform.

### 3.2. Herramientas necesarias

Prepara:

- Docker con su motor disponible.
- Docker Compose.
- AWS CLI versión 2.
- Terraform compatible con el proyecto.
- `curl`.
- Un editor de texto.

### 3.3. Condición del curso

El docente debe proporcionar una combinación de versiones previamente probada.
No cambies esa combinación durante una comparación sin registrarlo.

---

## 4. Vocabulario: servicio, operación y funcionalidad

La precisión del vocabulario evita conclusiones demasiado amplias.

### 4.1. Servicio

Un servicio agrupa capacidades relacionadas.
S3 es un servicio de almacenamiento de objetos.
SQS es un servicio de colas.
DynamoDB es un servicio de base de datos.

### 4.2. Operación

Una operación es una solicitud concreta de la API.
Por ejemplo, crear un bucket o consultar una cola.
La implementación de una operación no demuestra la implementación de todas las demás.

### 4.3. Funcionalidad

Una funcionalidad puede combinar varias operaciones y comportamientos.
El versionado, las notificaciones o una integración entre servicios son funcionalidades.
Pueden requerir pruebas adicionales aunque las operaciones básicas funcionen.

### 4.4. Ejemplo de alcance

Una prueba de subida y descarga de objetos no valida automáticamente:
- Versionado.
- Cifrado.
- Replicación.
- Políticas de acceso.

---

## 5. Qué significa que un servicio esté disponible

Disponible puede significar cosas distintas según la evidencia utilizada.

### 5.1. Disponibilidad documental

La documentación puede indicar que el servicio pertenece al alcance de una edición.
Eso permite diseñar una prueba.
No sustituye la ejecución de esa prueba.

### 5.2. Disponibilidad operativa

El entorno responde a una operación concreta.
Por ejemplo, S3 devuelve una lista de buckets.
Esa respuesta demuestra disponibilidad para esa consulta.

### 5.3. Disponibilidad para una actividad

La actividad completa puede ejecutarse con los recursos y herramientas del grupo.
Incluye creación, uso, comprobación y limpieza.
Un servicio que responde parcialmente puede no ser suficiente.

### 5.4. Formulación recomendada

Escribe:
> En este entorno, `ListBuckets` terminó correctamente.

No escribas:
> S3 funciona completamente y es equivalente a AWS.

---

## 6. Dimensiones de compatibilidad

La compatibilidad no es una propiedad única.

### 6.1. Comparación inicial

La tabla organiza las dimensiones que utilizaremos.

| **Dimensión** | **Qué se comprueba** | **Ejemplo** |
|---------------|----------------------|-------------|
| Sintaxis | Aceptación de parámetros | Solicitud de creación |
| Respuesta | Estructura y valores | Nombre o identificador |
| Semántica | Efecto de la operación | Objeto recuperable |
| Errores | Comportamiento ante fallos | Nombre inexistente |
| Integración | Relación entre servicios | Evento y consumidor |

Una solicitud aceptada no demuestra por sí sola que su efecto sea correcto.

### 6.2. Compatibilidad operativa

También conviene comprobar:
- Repetición.
- Limpieza.
- Dependencias.
- Tiempo de respuesta.
- Cambios entre versiones.

### 6.3. Criterio del curso

La profundidad de la prueba debe corresponder al objetivo y al riesgo de la actividad.

---

## 7. Versiones, imágenes y ediciones

Estos conceptos identifican partes diferentes del entorno.

### 7.1. Versión

La versión identifica una entrega del software.
Puede modificar operaciones, errores y configuración.
No actualices automáticamente para resolver un fallo sin investigar.

### 7.2. Imagen

La imagen es el artefacto que ejecuta Docker.
Puede seleccionarse mediante una etiqueta.
Un digest identifica un contenido de imagen con mayor precisión.

### 7.3. Edición o modalidad

La edición o modalidad determina el conjunto de capacidades y condiciones de acceso.
Puede estar asociada a una suscripción o a requisitos de autenticación.
Los nombres y las condiciones comerciales pueden cambiar.

### 7.4. Regla de documentación

Registra por separado:
- Referencia de imagen.
- Versión identificada.
- Edición o modalidad contratada.
- Funcionalidad requerida.
- Evidencia de disponibilidad.

---

## 8. Cómo documentar las ediciones sin inventar un catálogo

El catálogo debe consultarse cuando se prepara o actualiza el curso.

### 8.1. Información necesaria

Comprueba:
- Nombre vigente de la modalidad.
- Funcionalidades incluidas.
- Condiciones de uso educativo.
- Requisitos de autenticación.
- Límites relevantes.
- Documentación de la versión.

### 8.2. Comparación orientativa

La tabla describe situaciones posibles, no nombres comerciales garantizados.

| **Situación** | **Implicación** | **Comprobación requerida** |
|---------------|-----------------|---------------------------|
| Funcionalidad disponible | Puede diseñarse una prueba | Ejecutar la actividad |
| Funcionalidad restringida | Puede requerir otra modalidad | Revisar condiciones |
| Funcionalidad no documentada | No asumir disponibilidad | Investigar y probar |
| Funcionalidad retirada | Revisar el material | Adaptar el ejercicio |

No deduzcas la edición efectiva únicamente del nombre del repositorio de la imagen.

### 8.3. Uso responsable

No intentes eludir mecanismos de licencia o autenticación para completar una práctica.

---

## 9. Autenticación de LocalStack y credenciales de AWS

Ambos mecanismos cumplen funciones distintas.

### 9.1. Credenciales ficticias de las solicitudes

Utilizaremos:
- Access key: `test`.
- Secret key: `test`.
- Región de referencia: `us-east-1`.

Estos valores permiten construir solicitudes del laboratorio.
No representan una identidad real de AWS.

### 9.2. Token de acceso a una modalidad

Una modalidad de LocalStack puede requerir un token propio.
Ese token no es la secret key ficticia de las solicitudes.
Debe gestionarse como un secreto.

### 9.3. Datos que no deben publicarse

No incluyas:
- Tokens de suscripción.
- Claves reales de AWS.
- Credenciales corporativas.
- Capturas con secretos visibles.

### 9.4. Regla práctica

Si el entorno requiere autenticación, el docente debe proporcionar un procedimiento autorizado.

---

## 10. Fuentes que deben consultarse

La selección de fuentes forma parte de la verificación.

### 10.1. Fuentes prioritarias

Consulta:
- Documentación oficial de LocalStack.
- Cobertura de servicios y operaciones.
- Notas de publicación.
- Condiciones de la modalidad utilizada.
- Documentación del provider de AWS.
- Documentación de la API de AWS.

### 10.2. Qué registrar

Por cada fuente, conserva:
- Título.
- Ubicación o referencia.
- Fecha de consulta.
- Versión a la que se refiere.
- Afirmación utilizada.

### 10.3. Cuidado con los ejemplos antiguos

Un tutorial puede utilizar variables o recursos que hayan cambiado.
No lo conviertas automáticamente en una instrucción del curso.
Contrasta su contexto antes de copiar comandos.

### 10.4. Evidencia honesta

No afirmes haber consultado una fuente si no la consultaste.

---

## 11. Matriz de compatibilidad del curso

La matriz conecta objetivos educativos con operaciones comprobables.

### 11.1. Plantilla inicial

Utiliza una fila por capacidad evaluada.

| **Capacidad** | **Operaciones necesarias** | **Resultado** | **Limitación** |
|---------------|----------------------------|---------------|----------------|
| Bucket básico | Crear, consultar, eliminar | Pendiente | Sin prueba ejecutada |
| Objeto S3 | Subir, recuperar, eliminar | Pendiente | Sin prueba de versionado |
| Cola básica | Crear, enviar, recibir | Pendiente | Ampliación opcional |
| Tabla básica | Crear, escribir, leer | Pendiente | Ampliación opcional |

Las filas son objetivos de prueba, no promesas de disponibilidad.

### 11.2. Información complementaria

Añade en el registro:
- Imagen.
- Edición.
- Versiones de clientes.
- Fecha.
- Comandos exactos.
- Evidencias saneadas.

### 11.3. Actualización

La matriz debe revisarse cuando cambie una dependencia relevante.

---

## 12. Estados de evaluación

Utiliza etiquetas que distingan documentación, ejecución y diagnóstico.

### 12.1. Estados recomendados

- **Pendiente:** todavía no se ha evaluado.
- **Documentado:** una fuente indica disponibilidad.
- **Verificado:** la prueba definida terminó correctamente.
- **Parcial:** solo se completó parte de la actividad.
- **Bloqueado:** una condición impide probar.
- **Fallido:** la prueba ejecutada no cumplió su criterio.

### 12.2. Estado no demostrado

No uses “no compatible” ante cualquier fallo.
Una conexión rechazada puede deberse al puerto.
Un error de credenciales puede deberse al cliente.
Un parámetro rechazado puede pertenecer a otra versión.

### 12.3. Evidencia exigida

Cada estado debe incluir una justificación observable.
“Me parece que funciona” no es una evidencia suficiente.

### 12.4. Fallos críticos

Una operación fuera del entorno autorizado obliga a detener la prueba.

---

## 13. Preparación del proyecto

Utiliza un directorio exclusivo para esta evaluación.

### 13.1. Crear carpetas

```bash
mkdir -p ~/cursos/terraform/compatibilidad-localstack/evidencias
cd ~/cursos/terraform/compatibilidad-localstack
```

### 13.2. Organización prevista

```text
compatibilidad-localstack/
├── compose.yaml
├── .env
├── .env.example
├── .gitignore
├── versions.tf
├── providers.tf
├── main.tf
├── outputs.tf
└── evidencias/
    ├── matriz.md
    └── registro.md
```

### 13.3. Separación

No copies estados de otras prácticas ni configuraciones con recursos adicionales.

---

## 14. Seleccionar la imagen del laboratorio

El docente debe proporcionar una referencia probada.

### 14.1. Archivo `.env.example`

```dotenv
COMPOSE_PROJECT_NAME=aula-compatibilidad
LOCALSTACK_IMAGE=localstack/localstack:ETIQUETA_PROBADA
LOCALSTACK_PORT=4566
```

### 14.2. Crear la configuración local

```bash
cp .env.example .env
```

Sustituye `ETIQUETA_PROBADA` por la referencia autorizada.
No ejecutes el laboratorio conservando el marcador.
No cambies automáticamente a `latest`.

### 14.3. Datos del entorno

Registra:
- Referencia completa.
- Arquitectura del equipo.
- Modalidad utilizada.
- Requisitos adicionales.
- Fecha de preparación.

### 14.4. Alcance

La imagen por sí sola no acredita todas las capacidades disponibles en la sesión.

---

## 15. Configuración principal con Docker Compose

La primera fase contempla únicamente S3 y STS.

### 15.1. Archivo `compose.yaml`

```yaml
services:
  localstack:
    image: "${LOCALSTACK_IMAGE:?Define LOCALSTACK_IMAGE en .env}"
    ports:
      - "127.0.0.1:${LOCALSTACK_PORT:-4566}:4566"
    environment:
      SERVICES: s3,sts
      AWS_DEFAULT_REGION: us-east-1
```

### 15.2. Decisiones del ejemplo

No se monta el socket de Docker.
No se configura persistencia explícita.
No se publican puertos en todas las interfaces.
No se incluyen secretos.

### 15.3. Configuración y licencia

Declarar un servicio no concede derechos de acceso a una funcionalidad.
La variable `SERVICES` tampoco demuestra implementación completa.
Comprueba su comportamiento en la versión utilizada.

---

## 16. Arranque y observación del entorno

Separa validación, descarga y ejecución.

### 16.1. Comandos

```bash
docker compose config --quiet
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail=100 localstack
```

### 16.2. Endpoint anfitrión

```bash
export LOCALSTACK_ENDPOINT="http://localhost:4566"
```

### 16.3. Consulta auxiliar

```bash
curl --fail --silent --show-error \
  "${LOCALSTACK_ENDPOINT}/_localstack/health"
```

### 16.4. Interpretación

La respuesta de salud depende de la versión.
La disponibilidad funcional se comprobará con operaciones del servicio.

---

## 17. Cliente AWS CLI con destino explícito

La función evita modificar los archivos personales de credenciales.

### 17.1. Definir en Bash

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
    --endpoint-url "${LOCALSTACK_ENDPOINT:?Define LOCALSTACK_ENDPOINT}" \
    --region us-east-1 \
    --no-cli-pager \
    "$@"
}
```

### 17.2. Alcance

La función utiliza credenciales ficticias por invocación.
No constituye aislamiento completo de red.
Debe definirse otra vez en una terminal nueva.

---

## 18. Primera prueba: disponibilidad de S3

La primera consulta tiene un criterio pequeño y explícito.

### 18.1. Ejecutar

```bash
aws_local s3api list-buckets
resultado=$?
printf 'Codigo de salida: %s\n' "$resultado"
```

### 18.2. Criterio de aceptación

La operación debe terminar correctamente.
La respuesta debe tener una estructura coherente con un listado de buckets.
Una lista vacía es válida en un entorno limpio.

### 18.3. Qué registrar

Anota:
- Comando.
- Código de salida.
- Resultado relevante.
- Tiempo aproximado.
- Mensajes inesperados.

### 18.4. Límite

Esta prueba verifica `ListBuckets`, no el servicio S3 completo.

---

## 19. Segunda prueba: ciclo de vida de un bucket

El ejercicio añade creación y consulta.

### 19.1. Nombre del recurso

```bash
export S3_BUCKET="aula-compatibilidad-s3-001"
```

### 19.2. Crear y comprobar

```bash
aws_local s3api create-bucket \
  --bucket "$S3_BUCKET"

aws_local s3api head-bucket \
  --bucket "$S3_BUCKET"
```

### 19.3. Criterio de aceptación

La creación termina correctamente.
La consulta confirma que el bucket responde.
El nombre aparece en el listado posterior.

### 19.4. Condiciones

Utilizamos `us-east-1`.
No generalices esta solicitud a cualquier región.
En entornos compartidos, acuerda nombres diferentes.

---

## 20. Tercera prueba: contenido recuperable

La subida debe verificarse mediante recuperación del contenido.

### 20.1. Crear y subir un archivo

```bash
mkdir -p materiales descargas

printf 'Contenido ficticio de compatibilidad.\n' \
  > materiales/mensaje.txt

aws_local s3api put-object \
  --bucket "$S3_BUCKET" \
  --key pruebas/mensaje.txt \
  --body materiales/mensaje.txt
```

### 20.2. Recuperar y comparar

```bash
aws_local s3api get-object \
  --bucket "$S3_BUCKET" \
  --key pruebas/mensaje.txt \
  descargas/mensaje.txt

cmp materiales/mensaje.txt descargas/mensaje.txt
```

### 20.3. Alcance

La igualdad del contenido no valida versionado, cifrado ni durabilidad de AWS.

---

## 21. Cuarta prueba: etiquetas y semántica

La prueba debe comprobar el efecto de la operación.

### 21.1. Establecer etiquetas

```bash
aws_local s3api put-bucket-tagging \
  --bucket "$S3_BUCKET" \
  --tagging '{"TagSet":[{"Key":"Curso","Value":"Terraform"},{"Key":"Prueba","Value":"Compatibilidad"}]}'
```

### 21.2. Consultar

```bash
aws_local s3api get-bucket-tagging \
  --bucket "$S3_BUCKET"
```

### 21.3. Criterio de aceptación

Las claves y los valores deben corresponder al conjunto enviado.
No exijas un orden específico sin necesidad.
La respuesta debe analizarse semánticamente.

### 21.4. Matiz importante

La operación establece un conjunto de etiquetas.
No representa una adición aislada que conserve automáticamente todas las anteriores.

---

## 22. Quinta prueba: eliminación verificable

La limpieza también forma parte de la compatibilidad de una actividad.

### 22.1. Eliminar el objeto

```bash
aws_local s3api delete-object \
  --bucket "$S3_BUCKET" \
  --key pruebas/mensaje.txt
```

### 22.2. Comprobar y eliminar el bucket

```bash
aws_local s3api list-objects-v2 \
  --bucket "$S3_BUCKET"

aws_local s3api delete-bucket \
  --bucket "$S3_BUCKET"
```

### 22.3. Criterio

El objeto debe dejar de aparecer.
El bucket debe dejar de aparecer en el listado.
No uses únicamente el mensaje de eliminación como evidencia.

### 22.4. Límite

Este procedimiento presupone un bucket sin versionado.
No constituye una limpieza completa de versiones y marcadores de eliminación.

---

## 23. Integración con Terraform: dependencias

La segunda fase prueba una configuración declarativa pequeña.

### 23.1. Archivo `versions.tf`

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

### 23.2. Interpretación

Terraform CLI y el provider tienen versiones independientes.
La restricción permite selecciones dentro de la serie 5.
El archivo de bloqueo registra la selección efectiva.

### 23.3. Regla del curso

Estas restricciones son una base didáctica.
La combinación debe probarse antes de distribuir el laboratorio.
No uses `init -upgrade` durante una comparación sin registrarlo.

---

## 24. Configuración del provider local

El provider debe indicar destinos locales para los servicios utilizados.

### 24.1. Archivo `providers.tf`

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
    s3  = "http://localhost:4566"
    sts = "http://localhost:4566"
  }
}
```

### 24.2. Límites

Las opciones `skip_*` no son un cortafuegos.
Los servicios añadidos necesitan revisión de endpoints.
Configurar AWS CLI no configura automáticamente este provider.

---

## 25. Recurso Terraform y verificación cruzada

El bucket declarativo tendrá un nombre distinto del bucket de CLI.

### 25.1. Archivo `main.tf`

```hcl
resource "aws_s3_bucket" "compatibilidad" {
  bucket        = "aula-compatibilidad-terraform-001"
  force_destroy = false
}
```

### 25.2. Ejecución revisada

```bash
terraform init
terraform fmt
terraform validate
terraform plan
terraform apply
```

### 25.3. Consulta independiente

```bash
aws_local s3api head-bucket \
  --bucket aula-compatibilidad-terraform-001
```

### 25.4. Criterio

El plan debe limitarse al recurso previsto y la API debe confirmar su existencia.

---

## 26. Qué demuestra la integración declarativa

La creación mediante Terraform evalúa más de una operación.

### 26.1. Cadena de componentes

Intervienen:
- Terraform CLI.
- Provider de AWS.
- Configuración del endpoint.
- API emulada.
- Estado local.
- Consultas de seguimiento.

### 26.2. Posibles diferencias

Una llamada directa puede funcionar y un recurso Terraform puede fallar.
El provider puede realizar consultas adicionales.
También puede depender de atributos no probados por la CLI.
No concluyas automáticamente que el servicio está ausente.

### 26.3. Verificación posterior

Ejecuta:
```bash
terraform state list
terraform plan
```

### 26.4. Alcance

Un plan sin cambios indica convergencia dentro del alcance evaluado, no seguridad completa.

---

## 27. Ampliaciones opcionales: condiciones de entrada

SQS y DynamoDB solo se añadirán después de una decisión docente.

### 27.1. Requisitos

Comprueba:
- Disponibilidad documentada.
- Edición o modalidad.
- Operaciones necesarias.
- Recursos del equipo.
- Procedimiento de limpieza.
- Tiempo disponible.

### 27.2. Cambio de Compose

Si las ampliaciones están autorizadas, el conjunto puede pasar a:

```yaml
environment:
  SERVICES: s3,sts,sqs,dynamodb
  AWS_DEFAULT_REGION: us-east-1
```

### 27.3. Precaución

Antes de una posible recreación, limpia los recursos del laboratorio principal.
Sin persistencia explícita, no presupongas conservación de datos.
Declarar los servicios no demuestra que estén implementados ni habilitados.

---

## 28. Ampliación SQS: crear y consultar una cola

La prueba evalúa una cola estándar sin integraciones adicionales.

### 28.1. Crear y conservar la URL

```bash
QUEUE_URL=$(aws_local sqs create-queue \
  --queue-name aula-compatibilidad-cola \
  --query 'QueueUrl' \
  --output text)
```

### 28.2. Comprobar el resultado

```bash
printf '%s\n' "$QUEUE_URL"

aws_local sqs get-queue-attributes \
  --queue-url "$QUEUE_URL" \
  --attribute-names QueueArn
```

### 28.3. Condición de continuidad

Comprueba que la creación terminó correctamente.
No continúes si la variable está vacía o contiene una respuesta inesperada.
Conserva la URL devuelta según el procedimiento de la versión utilizada.
No la sustituyas arbitrariamente.

---

## 29. Ampliación SQS: enviar y recibir

La prueba debe observar contenido y comportamiento básico.

### 29.1. Enviar

```bash
aws_local sqs send-message \
  --queue-url "$QUEUE_URL" \
  --message-body "Mensaje ficticio del laboratorio"
```

### 29.2. Recibir

```bash
aws_local sqs receive-message \
  --queue-url "$QUEUE_URL" \
  --max-number-of-messages 1 \
  --wait-time-seconds 2
```

### 29.3. Criterio de aceptación

La respuesta debe contener el mensaje enviado cuando se recibe.
Una recepción vacía necesita revisión o repetición limitada.
No demuestra por sí sola ausencia de mensajes.

### 29.4. Límite

Esta prueba no valida entrega exactamente una vez ni todas las garantías de SQS.

---

## 30. Ampliación SQS: borrar mensaje y cola

Recibir un mensaje no significa eliminarlo.

### 30.1. Receipt handle

La respuesta de recepción incluye un identificador para eliminar el mensaje.
Utiliza el `ReceiptHandle` de la recepción válida.
No uses el identificador del mensaje como sustituto.

### 30.2. Eliminación del mensaje

Tras asignar el valor recibido a `RECEIPT_HANDLE`:

```bash
aws_local sqs delete-message \
  --queue-url "$QUEUE_URL" \
  --receipt-handle "$RECEIPT_HANDLE"
```

### 30.3. Limpieza de la cola

```bash
aws_local sqs delete-queue \
  --queue-url "$QUEUE_URL"

aws_local sqs list-queues \
  --queue-name-prefix aula-compatibilidad
```

### 30.4. Evidencia

Registra la desaparición de la cola y los aspectos no evaluados.

---

## 31. Ampliación DynamoDB: crear una tabla

La tabla utilizará una clave de partición sencilla.

### 31.1. Solicitud de creación

```bash
aws_local dynamodb create-table \
  --table-name aula-compatibilidad-tabla \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

### 31.2. Esperar y consultar

```bash
aws_local dynamodb wait table-exists \
  --table-name aula-compatibilidad-tabla

aws_local dynamodb describe-table \
  --table-name aula-compatibilidad-tabla
```

### 31.3. Criterio

La tabla debe quedar disponible para la operación definida.
El waiter y sus tiempos deben comprobarse en la combinación utilizada.
No interpretes una respuesta local como validación de facturación real.

---

## 32. Ampliación DynamoDB: escribir, leer y limpiar

La prueba utilizará un elemento ficticio.

### 32.1. Escritura

```bash
aws_local dynamodb put-item \
  --table-name aula-compatibilidad-tabla \
  --item '{"id":{"S":"ejemplo-001"},"descripcion":{"S":"Dato ficticio"}}'
```

### 32.2. Lectura

```bash
aws_local dynamodb get-item \
  --table-name aula-compatibilidad-tabla \
  --key '{"id":{"S":"ejemplo-001"}}' \
  --consistent-read
```

### 32.3. Limpieza

```bash
aws_local dynamodb delete-table \
  --table-name aula-compatibilidad-tabla
```

### 32.4. Límite

La prueba no valida escalado, índices, streams ni todas las garantías de consistencia de AWS.

---

## 33. Integraciones entre servicios

La disponibilidad individual no garantiza una integración completa.

### 33.1. Ejemplo conceptual

Una actividad puede requerir:
- Almacenamiento en S3.
- Generación de un evento.
- Entrega en una cola.
- Procesamiento por un consumidor.

### 33.2. Qué comprobar

Evalúa:
- Configuración de la relación.
- Evento esperado.
- Contenido del evento.
- Entrega.
- Reintentos.
- Limpieza.

### 33.3. Error frecuente

No declares compatible una integración porque cada servicio responde a una consulta.
La relación puede tener limitaciones propias.
También puede pertenecer a otra modalidad.
La actividad requiere una prueba de extremo a extremo.

### 33.4. Decisión educativa

Introduce integraciones después de dominar las operaciones independientes.

---

## 34. IAM, seguridad y controles de acceso

La emulación de seguridad necesita una evaluación específica.

### 34.1. Qué no debe asumirse

No presupongas reproducción completa de:
- Evaluación de políticas.
- Roles.
- Confianza entre identidades.
- Condiciones de acceso.
- Auditoría.
- Restricciones organizativas.

### 34.2. Pruebas negativas

Una prueba de seguridad puede necesitar una denegación esperada.
La aceptación de una solicitud no demuestra que la política esté bien diseñada.
Un error de acceso tampoco identifica automáticamente la causa.
Debe contrastarse con la configuración y el alcance del emulador.

### 34.3. Responsabilidad del curso

Las prácticas locales no deben certificar seguridad productiva.
La validación real requiere un entorno autorizado y criterios propios.

### 34.4. Credenciales ficticias

No sustituyas las credenciales ficticias por reales para resolver diferencias de comportamiento.

---

## 35. Rendimiento, tiempos y consistencia

El entorno local tiene características distintas de AWS.

### 35.1. Factores locales

Los resultados dependen de:
- CPU.
- Memoria.
- Almacenamiento.
- Virtualización.
- Carga del equipo.
- Versión del software.

### 35.2. Interpretación de tiempos

Una operación rápida no demuestra rendimiento productivo.
Una operación lenta no demuestra un problema de AWS.
Los waiters y reintentos deben tener límites.
No diseñes pruebas basadas únicamente en pausas arbitrarias.

### 35.3. Consistencia

Las respuestas inmediatas del emulador pueden diferir del servicio real.
Una prueba local no reproduce necesariamente todos los estados intermedios.
Documenta esa limitación.

### 35.4. Criterio educativo

Evalúa resultados observables, no comparaciones de rendimiento sin una metodología.

---

## 36. Diagnóstico de fallos de compatibilidad

Un fallo puede pertenecer a capas diferentes.

### 36.1. Clasificación orientativa

| **Capa** | **Síntoma posible** | **Comprobación inicial** |
|----------|--------------------|--------------------------|
| Cliente | Parámetro desconocido | Versión y sintaxis |
| Red | Conexión rechazada | Puerto y contenedor |
| Configuración | Endpoint incorrecto | Variables y provider |
| Modalidad | Funcionalidad restringida | Condiciones de acceso |
| Emulación | Operación no implementada | Cobertura y registros |

La clasificación guía la investigación, pero no confirma el diagnóstico.

### 36.2. Secuencia de trabajo

Copia el error saneado.
Identifica el comando.
Comprueba el entorno.
Consulta la documentación correspondiente.
Formula una hipótesis.
Cambia una condición relevante.
Repite y registra.

### 36.3. Regla

No amplíes privilegios ni cambies a AWS real como respuesta automática.

---

## 37. Sesión práctica A: evaluar una funcionalidad

La primera sesión trabaja alcance y evidencias.

### 37.1. Duración y objetivo

Duración orientativa: 30 minutos.
Objetivo: evaluar el ciclo básico de un bucket y un objeto.

### 37.2. Actividades

1. Identifica imagen y modalidad.
2. Completa las filas pendientes de la matriz.
3. Ejecuta las pruebas S3.
4. Registra resultados.
5. Limpia los recursos.
6. Redacta una conclusión limitada.

### 37.3. Entregable

Entrega la matriz y tres evidencias.
Incluye una operación verificada y dos funcionalidades no evaluadas.
No escribas que S3 está totalmente validado.
Explica qué actividad concreta podría realizar un alumno.

### 37.4. Condición

Las herramientas deben estar instaladas antes de comenzar el tiempo de la sesión.

---

## 38. Sesión práctica B: revisar Terraform por parejas

La segunda sesión distingue API y gestión declarativa.

### 38.1. Duración y objetivo

Duración orientativa: 35 minutos.
Objetivo: comprobar que una configuración Terraform cumple una tarea definida.

### 38.2. Actividades

Una persona prepara los archivos.
La otra revisa endpoints y recursos.
Ambas interpretan el plan.
Después aplican y consultan S3.
Finalmente generan otro plan.

### 38.3. Preguntas de revisión

- ¿Qué operaciones podría necesitar el provider?
- ¿Qué evidencia procede del estado?
- ¿Qué evidencia procede de la API?
- ¿Qué cambio obligaría a repetir la prueba?

### 38.4. Entregable

Entrega el código y una explicación de la cadena de componentes.
Incluye la limpieza del recurso declarativo.

---

## 39. Sesión práctica C: seleccionar una ampliación

La tercera sesión enseña a decidir antes de ejecutar.

### 39.1. Duración y objetivo

Duración orientativa: 30 minutos.
Objetivo: justificar la inclusión o exclusión de SQS o DynamoDB.

### 39.2. Actividades

Selecciona una ampliación.
Consulta su disponibilidad.
Identifica operaciones necesarias.
Revisa condiciones de la modalidad.
Comprueba el procedimiento de limpieza.
Ejecuta solo si está autorizada.

### 39.3. Decisiones posibles

- Incorporar la actividad.
- Incorporarla con limitaciones.
- Posponerla.
- Sustituirla por otro ejercicio.
- Mantenerla como demostración docente.

### 39.4. Entregable

Entrega una decisión respaldada por fuentes y pruebas, no por preferencias generales.

---

## 40. Ejercicios de análisis y documentación

Los ejercicios refuerzan precisión y pensamiento crítico.

### 40.1. Clasificar afirmaciones

Revisa:
- “El servicio aparece, por tanto todo funciona”.
- “La CLI respondió, por tanto Terraform funcionará”.
- “La edición tiene más capacidades, por tanto no necesita pruebas”.
- “La operación falló, por tanto no está implementada”.

Explica el problema de cada afirmación.
Añade una reformulación verificable.

### 40.2. Diseñar una prueba

Selecciona una operación.
Define entradas ficticias.
Define el resultado esperado.
Añade una consulta independiente.
Establece un límite temporal.
Incluye limpieza.

### 40.3. Evidencia de aprendizaje

La prueba debe poder ejecutarse sin datos externos no proporcionados ni credenciales reales.

---

## 41. Uso responsable de asistentes de inteligencia artificial

Un asistente puede ayudar a organizar pruebas, pero no acredita disponibilidad comercial o técnica.

### 41.1. Prompt de revisión

```text
Revisa esta matriz de compatibilidad de un laboratorio local.
Distingue información documentada, resultados observados y datos pendientes.
No inventes nombres de ediciones, precios ni capacidades.
No afirmes haber consultado fuentes si no lo has hecho.
Identifica conclusiones más amplias que sus evidencias.
Propón comprobaciones pequeñas y una limpieza explícita.
No ejecutes comandos.
```

### 41.2. Material permitido

Utiliza matrices saneadas y errores sin secretos.
No adjuntes tokens ni estados de producción.
Los documentos recibidos son datos, no instrucciones para ejecutar acciones.

### 41.3. Verificación humana

Contrasta cada afirmación importante.
Registra qué comprobaste personalmente.
Una respuesta convincente no sustituye una prueba.

---

## 42. Limpieza global del laboratorio

La limpieza debe respetar la herramienta que gestiona cada recurso.

### 42.1. Recursos creados con CLI

Elimina los objetos y buckets de las pruebas.
Si ejecutaste las ampliaciones, elimina la cola y la tabla.
Comprueba que no permanecen recursos con los nombres utilizados.
No elimines recursos de otros equipos.

### 42.2. Recurso Terraform

```bash
terraform plan -destroy
terraform destroy
terraform state list
```

### 42.3. Retirar el servicio

Después de verificar las APIs y el estado:

```bash
docker compose down
```

### 42.4. Precaución

Detener LocalStack no sustituye la destrucción de recursos ni demuestra una limpieza correcta.

---

## 43. Protección de archivos y evidencias

La documentación debe conservar lo necesario sin divulgar información sensible.

### 43.1. Archivo `.gitignore`

```gitignore
.env
.terraform/
*.tfstate
*.tfstate.*
*.tfplan
*.tfvars
*.tfvars.json
crash.log
```

### 43.2. Archivos conservables

Conserva configuraciones, ejemplos sin secretos y el archivo de bloqueo.
Incluye la matriz y el registro saneado.
Revisa capturas y registros antes de compartirlos.
Un archivo ignorado puede seguir registrado si ya estaba en Git.

### 43.3. Plantilla breve

Registra fecha, versiones, modalidad, operación, criterio y resultado.
Añade limitaciones, limpieza y aspectos pendientes.

---

## 44. Evaluación de la unidad

La evaluación combina ejecución, precisión y responsabilidad.

### 44.1. Rúbrica inicial

| **Criterio** | **0 puntos** | **1 punto** | **2 puntos** |
|-------------|--------------|-------------|-------------|
| Alcance | Afirmaciones generales | Alcance incompleto | Operaciones bien delimitadas |
| Evidencias | Sin pruebas | Pruebas parciales | Resultados verificables |
| Diagnóstico | Causas inventadas | Hipótesis incompleta | Investigación fundamentada |
| Seguridad | Incumple límites | Cumplimiento parcial | Controles y limpieza |
| Documentación | No reproducible | Faltan condiciones | Entorno y límites registrados |

La puntuación máxima es diez.
Una puntuación alta no compensa una ejecución no autorizada.
La exposición de secretos debe tratarse como un fallo crítico.

### 44.2. Criterio esencial

El alumno debe explicar qué ha verificado y qué no.
Copiar comandos no demuestra comprensión.
La conclusión debe corresponder a la evidencia.

---

## 45. Resumen y siguientes pasos

Seleccionar un servicio es seleccionar operaciones, condiciones y límites de una actividad.

### 45.1. Ideas esenciales

- Servicio disponible no significa API completa.
- Una operación aceptada necesita comprobar su efecto.
- Versiones y modalidades deben documentarse por separado.
- Las condiciones comerciales deben consultarse cuando se prepara el curso.
- La CLI y Terraform tienen dependencias diferentes.
- La seguridad real no se certifica mediante emulación local.
- Las integraciones necesitan pruebas de extremo a extremo.
- La limpieza forma parte de la compatibilidad.

### 45.2. Rutina reutilizable

Define la tarea.
Consulta el alcance documentado.
Identifica el entorno.
Ejecuta una prueba pequeña.
Verifica el resultado.
Documenta limitaciones.
Limpia y revisa.

### 45.3. Cierre

**Utiliza LocalStack para aprender con evidencias, no para suponer equivalencias.**
Una matriz honesta y reproducible resulta más útil que una lista extensa de servicios sin comprobar.