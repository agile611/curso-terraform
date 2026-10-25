# Verificación de recursos con AWS CLI en Terraform y LocalStack

> Curso de Terraform con LocalStack emulando servicios de AWS.
> Todas las prácticas de esta lección se ejecutan localmente.
> No necesitas una cuenta de AWS para completar el laboratorio.
> Utiliza exclusivamente credenciales ficticias y endpoints locales.
> Una prueba satisfactoria en LocalStack no equivale a validar AWS real.

Crear un recurso y comprobarlo son actividades diferentes.
Terraform informa sobre las operaciones realizadas y conserva relaciones en su estado.
AWS CLI permite consultar la API para observar los recursos y sus propiedades.
La combinación de ambas herramientas ayuda a identificar errores y limitar las conclusiones.

Esta lección desarrolla un procedimiento de verificación reproducible.
Comprobaremos existencia, etiquetas y contenido de un bucket S3.
Después automatizaremos algunas comprobaciones con Bash y `jq`.
Las ampliaciones introducirán SQS y DynamoDB cuando el entorno las admita.

El objetivo es obtener evidencias claras, no acumular comandos.
Cada comprobación tendrá un alcance, un criterio de aceptación y una interpretación.
También distinguiremos consultas de lectura y operaciones que modifican recursos.

---

## 1. Objetivos de aprendizaje

La unidad enseña a comprobar recursos mediante consultas independientes.

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Diferenciar configuración, estado y respuesta de la API.
- Explicar qué demuestra una consulta de existencia.
- Distinguir presencia de un recurso y corrección de sus propiedades.
- Reconocer límites de listados y consultas filtradas.
- Interpretar resultados sin inventar causas.

### 1.2. Objetivos prácticos

También podrás:

- Consultar recursos locales mediante AWS CLI.
- Comparar etiquetas con valores esperados.
- Descargar y comprobar contenido.
- Automatizar verificaciones pequeñas.
- Documentar fallos y limpiar el laboratorio.

---

## 2. Alcance de la documentación

El laboratorio principal utiliza un bucket y un objeto gestionados por Terraform.

### 2.1. Servicios utilizados

Trabajaremos principalmente con S3.
STS aparecerá como endpoint auxiliar del provider.
SQS y DynamoDB serán ampliaciones opcionales.
No se ejecutarán ampliaciones sin comprobar su disponibilidad.

### 2.2. Herramientas utilizadas

Necesitarás:

- Terraform CLI.
- Provider de AWS.
- Docker Compose.
- LocalStack.
- AWS CLI versión 2.
- Bash y `jq`.

### 2.3. Exclusiones

No comprobaremos recursos de producción ni utilizaremos credenciales reales.
La verificación local no certificará seguridad, rendimiento o disponibilidad de AWS.

---

## 3. Requisitos previos

Las herramientas deben estar disponibles antes de iniciar las sesiones.

### 3.1. Comprobación de ejecutables

```bash
terraform version
docker version
docker compose version
aws --version
jq --version
```

### 3.2. Interpretación

Docker debe mostrar un servidor disponible.
AWS CLI debe corresponder a la versión 2.
`jq` debe estar instalado para las comprobaciones automatizadas.
Resuelve instalación y permisos antes de continuar.

### 3.3. Conocimientos necesarios

Debes saber editar archivos HCL y ejecutar comandos Bash.
También debes distinguir el directorio del proyecto y el contexto de Docker.
La lección anterior proporciona el ciclo básico de despliegue.

---

## 4. Versiones y reproducibilidad

La respuesta observada depende de la combinación de herramientas utilizada.

### 4.1. Base didáctica

Utilizaremos Terraform desde 1.6 y anterior a 2.0.
El provider de AWS se limitará a la serie 5.
LocalStack utilizará una imagen concreta proporcionada por el docente.
Estas elecciones no representan una lista de versiones actuales.

### 4.2. Información que debes registrar

Conserva:

- Terraform CLI y provider efectivo.
- Docker y Docker Compose.
- AWS CLI y `jq`.
- Imagen y modalidad de LocalStack.
- Sistema operativo y arquitectura.
- Fecha de ejecución.

### 4.3. Regla

El docente debe probar la combinación antes de impartir la sesión.
Esta página no afirma haber ejecutado los comandos en tu equipo.

---

## 5. Qué significa verificar un recurso

Verificar consiste en contrastar una expectativa con una observación definida.

### 5.1. Ejemplo sencillo

Expectativa:
> Existe el bucket creado por este proyecto.

Observación:
> `head-bucket` termina correctamente para el nombre esperado.

La conclusión debe mantenerse dentro de ese alcance.
No demuestra contenido, permisos completos ni todas las propiedades del bucket.

### 5.2. Componentes de una comprobación

Define:

- Recurso objetivo.
- Operación utilizada.
- Contexto de conexión.
- Resultado esperado.
- Resultado observado.
- Criterio de aceptación.

### 5.3. Regla principal

**Una evidencia útil responde una pregunta concreta.**

---

## 6. Configuración, estado y API

Estas fuentes describen aspectos diferentes del laboratorio.

### 6.1. Comparación

La tabla ayuda a separar sus responsabilidades.

| **Fuente** | **Qué describe** | **Limitación principal** |
|------------|-----------------|-------------------------|
| Configuración HCL | Intención declarada | No demuestra ejecución |
| Plan de Terraform | Cambios propuestos | No demuestra aplicación |
| Estado de Terraform | Relaciones y atributos registrados | No es inventario completo |
| AWS CLI | Respuesta de una API | Depende de contexto y operación |

Ninguna fuente sustituye universalmente a las demás.

### 6.2. Consecuencia práctica

Un recurso puede aparecer en el estado y haber sido eliminado externamente.
Un recurso puede existir en LocalStack y no estar gestionado por Terraform.
Por eso conviene comparar fuentes sin confundirlas.
La independencia de clientes tampoco elimina los límites compartidos del emulador.

---

## 7. Capas de verificación

Una actividad completa suele necesitar varias comprobaciones.

### 7.1. Existencia

Comprueba que el recurso responde.
Utiliza una operación adecuada para el servicio.
No traduzcas cualquier error a recurso inexistente.

### 7.2. Propiedades

Consulta atributos relevantes.
Compara valores, no solamente presencia de campos.
Evita exigir un orden irrelevante.

### 7.3. Comportamiento

Realiza una operación autorizada de uso.
Por ejemplo, recupera un objeto y compara sus bytes.
Distingue esta prueba de las consultas puramente de lectura.

### 7.4. Limpieza

Comprueba que los recursos del ejercicio dejan de existir.
No confíes únicamente en un mensaje de destrucción.

---

## 8. Criterios de aceptación

Los criterios deben definirse antes de interpretar resultados.

### 8.1. Matriz inicial

La tabla recoge las comprobaciones principales.

| **Comprobación** | **Criterio** | **Evidencia** |
|-----------------|--------------|---------------|
| Bucket | Consulta de existencia satisfactoria | Código de salida |
| Etiquetas | Claves y valores esperados | JSON consultado |
| Objeto | Clave accesible y tamaño coherente | Metadatos |
| Contenido | Igualdad byte a byte | Resultado de `cmp` |
| Limpieza | Nombres del ejercicio ausentes | Consultas finales |

La matriz no implica que todas las pruebas ya estén ejecutadas.

### 8.2. Estados recomendados

Utiliza `pendiente`, `correcto`, `fallido` o `bloqueado`.
Añade una justificación observable.
No clasifiques como incompatible una actividad bloqueada por instalación.
No confundas ausencia de evidencia con evidencia de ausencia.

---

## 9. Seguridad y destino de las solicitudes

Antes de verificar, debes saber dónde consulta cada cliente.

### 9.1. Controles del laboratorio

- Utiliza credenciales ficticias.
- Declara un endpoint local explícito.
- Publica el puerto en `127.0.0.1`.
- Mantén una terminal dedicada.
- Revisa los servicios utilizados.
- Evita perfiles personales.

### 9.2. Lo que no garantiza aislamiento

Un alias llamado `local` no es un cortafuegos.
Un perfil llamado `localstack` tampoco lo es.
Las credenciales `test` no impiden intentar una conexión externa.

### 9.3. Detención

Detén la actividad ante destinos inesperados.
No introduzcas claves reales para resolver errores.
Los controles externos de red siguen siendo necesarios cuando el riesgo lo exige.

---

## 10. Consultas y operaciones modificadoras

No todos los comandos utilizados durante una prueba son de lectura.

### 10.1. Comparación

La tabla distingue ejemplos de esta unidad.

| **Operación** | **Efecto habitual** | **Uso educativo** |
|---------------|--------------------|------------------|
| `head-bucket` | Consulta | Existencia |
| `get-bucket-tagging` | Consulta | Propiedades |
| `get-object` | Descarga local | Contenido |
| `put-bucket-tagging` | Modifica etiquetas | Drift controlado |
| `delete-object` | Elimina o modifica estado del objeto | Limpieza específica |

La tabla describe las operaciones concretas, no una política general de permisos.

### 10.2. Precaución

Una descarga escribe un archivo local.
Una recepción SQS modifica temporalmente la visibilidad del mensaje.
Una prueba funcional puede tener efectos aunque parezca una consulta.
Documenta esos efectos antes de ejecutar.

---

## 11. Arquitectura del laboratorio

Los clientes se ejecutarán en el equipo anfitrión.

### 11.1. Recorrido

```text
Equipo anfitrión
├── Terraform ── Provider AWS ──┐
├── AWS CLI ───────────────────┤
├── jq                         │
└── Docker                     │
    └── LocalStack ◀───────────┘
          └── S3 local
```

### 11.2. Endpoint

Utilizaremos `http://localhost:4566`.
La región de referencia será `us-east-1`.
Las credenciales ficticias serán `test` y `test`.

### 11.3. Contexto

Desde otro contenedor, `localhost` identifica ese otro contenedor.
No mezcles esta arquitectura con instrucciones contenerizadas.
Una arquitectura diferente exige revisar nombres y rutas de red.

---

## 12. Preparar el proyecto

Puedes reutilizar ideas del despliegue anterior, pero no copies su estado.

### 12.1. Crear carpetas

```bash
mkdir -p ~/cursos/terraform/verificacion-cli/materiales
mkdir -p ~/cursos/terraform/verificacion-cli/descargas
mkdir -p ~/cursos/terraform/verificacion-cli/evidencias
mkdir -p ~/cursos/terraform/verificacion-cli/scripts

cd ~/cursos/terraform/verificacion-cli
```

### 12.2. Confirmar ubicación

```bash
pwd
ls -la
```

### 12.3. Regla

Todos los archivos `.tf` de este directorio se interpretan conjuntamente.
No mantengas configuraciones alternativas activas con nombres duplicados.
El laboratorio utilizará recursos con nombres propios.

---

## 13. Seleccionar la imagen de LocalStack

La imagen debe corresponder a la combinación probada por el curso.

### 13.1. Archivo `.env.example`

```dotenv
COMPOSE_PROJECT_NAME=aula-verificacion
LOCALSTACK_IMAGE=localstack/localstack:ETIQUETA_PROBADA
```

### 13.2. Crear configuración local

```bash
cp .env.example .env
```

Sustituye `ETIQUETA_PROBADA` antes de continuar.
No cambies automáticamente a `latest`.
Comprueba disponibilidad de S3 y condiciones de la modalidad.

### 13.3. Secretos

Un posible token de LocalStack no es la secret key ficticia de AWS.
Si se necesita, utiliza un procedimiento autorizado.
No lo publiques en documentación compartida.

---

## 14. Configurar y arrancar Compose

El laboratorio no necesita persistencia ni montaje del socket de Docker.

### 14.1. Archivo `compose.yaml`

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

### 14.2. Arranque

```bash
docker compose config --quiet
docker compose pull
docker compose up -d
docker compose ps
```

### 14.3. Alcance

Declarar servicios no acredita todas sus operaciones.

---

## 15. Comprobar puerto y servicio

La observación del contenedor es una primera evidencia.

### 15.1. Consultas auxiliares

```bash
docker compose port localstack 4566
docker compose logs --tail=100 localstack
curl --fail --silent --show-error \
  http://localhost:4566/_localstack/health
```

### 15.2. Interpretación

Un contenedor iniciado puede seguir inicializando APIs.
La respuesta de salud depende de la versión.
No presupongas una estructura idéntica entre imágenes.

### 15.3. Verificación funcional

La siguiente consulta S3 comprobará una operación concreta.
No sustituyas esa prueba por una captura de Docker.
No cambies a AWS real si el endpoint local falla.

---

## 16. Cliente AWS CLI local

La función mantendrá visibles las decisiones de conexión.

### 16.1. Archivo `scripts/cliente-local.sh`

```bash
aws_local() {
  AWS_ACCESS_KEY_ID=test \
  AWS_SECRET_ACCESS_KEY=test \
  AWS_SESSION_TOKEN= \
  AWS_CONFIG_FILE=/dev/null \
  AWS_SHARED_CREDENTIALS_FILE=/dev/null \
  AWS_EC2_METADATA_DISABLED=true \
  aws \
    --endpoint-url http://localhost:4566 \
    --region us-east-1 \
    --no-cli-pager \
    --output json \
    "$@"
}
```

> **Nota:** No se establece `AWS_PROFILE` porque `AWS_CONFIG_FILE=/dev/null` ya ignora cualquier perfil configurado. Establecer `AWS_PROFILE=` (vacío) causa error en AWS CLI v2: "The config profile () could not be found".

### 16.2. Alcance

El archivo contiene código Bash revisado, no una garantía universal de aislamiento.

---

## 17. Activar y probar la función

La función debe cargarse en cada terminal que la necesite.

### 17.1. Activación

```bash
source scripts/cliente-local.sh
type aws_local
aws_local s3api list-buckets
```

### 17.2. Interpretación

`source` ejecuta el contenido del archivo en la sesión actual.
Solo utilices archivos conocidos y revisados.
No cargues un archivo recibido sin inspeccionarlo.

### 17.3. Resultado esperado

Una lista vacía es válida en un entorno limpio.
Si aparecen recursos ajenos, no los elimines.
La función utiliza JSON por defecto.
Los comandos posteriores pueden seleccionar otro formato explícitamente.

---

## 18. Dependencias y entradas de Terraform

El proyecto mantendrá un nombre fijo para facilitar las comparaciones.

### 18.1. Archivo `versions.tf`

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

### 18.2. Archivo `variables.tf`

```hcl
variable "bucket_name" {
  type    = string
  default = "aula-verificacion-cli-001"
}
```

---

## 19. Provider local de Terraform

Terraform conserva una configuración distinta de AWS CLI.

### 19.1. Archivo `providers.tf`

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

### 19.2. Límite

Las opciones de omisión no bloquean tráfico externo.

---

## 20. Bucket, objeto y contenido

Terraform gestionará ambos recursos en el laboratorio principal.

### 20.1. Crear archivo ficticio

```bash
printf 'Verificacion local de recursos con AWS CLI.\n' \
  > materiales/mensaje.txt
```

### 20.2. Archivo `main.tf`

```hcl
resource "aws_s3_bucket" "laboratorio" {
  bucket        = var.bucket_name
  force_destroy = false

  tags = {
    Curso   = "Terraform"
    Entorno = "LocalStack"
  }
}

resource "aws_s3_object" "mensaje" {
  bucket      = aws_s3_bucket.laboratorio.id
  key         = "practicas/mensaje.txt"
  source      = "${path.module}/materiales/mensaje.txt"
  source_hash = filemd5("${path.module}/materiales/mensaje.txt")
}
```

---

## 21. Salidas para la verificación

Las salidas proporcionan identificadores concretos a los procedimientos.

### 21.1. Archivo `outputs.tf`

```hcl
output "bucket_name" {
  value = aws_s3_bucket.laboratorio.bucket
}

output "object_key" {
  value = aws_s3_object.mensaje.key
}
```

### 21.2. Desplegar

```bash
terraform init
terraform fmt
terraform validate
terraform plan
terraform apply
```

### 21.3. Revisión

Lee el plan antes de confirmar.
Deben aparecer únicamente los dos recursos previstos.

---

## 22. Recuperar identificadores del estado

Evita escribir manualmente nombres diferentes en cada comando.

### 22.1. Variables de sesión

```bash
BUCKET_NAME=$(terraform output -raw bucket_name)
OBJECT_KEY=$(terraform output -raw object_key)

printf 'Bucket: %s\n' "$BUCKET_NAME"
printf 'Clave: %s\n' "$OBJECT_KEY"
```

### 22.2. Condición de continuidad

Comprueba que ambos comandos terminaron correctamente.
No continúes con variables vacías.
Una asignación no demuestra que el recurso exista en la API.

### 22.3. Distinción

El estado aporta el identificador.
AWS CLI aportará la observación del servicio.
No uses estas salidas como una comprobación independiente de existencia.

---

## 23. Verificar existencia del bucket

`head-bucket` permite una comprobación pequeña y directa.

### 23.1. Ejecutar

```bash
aws_local s3api head-bucket \
  --bucket "$BUCKET_NAME"
resultado=$?
printf 'Resultado de head-bucket: %s\n' "$resultado"
```

### 23.2. Resultado esperado

La operación debe terminar correctamente.
Una respuesta satisfactoria puede no imprimir contenido.
El código del proceso debe guardarse inmediatamente.

### 23.3. Límite

Un error puede indicar conectividad, permisos, parámetros o ausencia.
No traduzcas cualquier resultado no nulo a bucket inexistente.
En AWS real, determinadas respuestas requieren aún más contexto.
La interpretación local debe conservar esos límites.

---

## 24. Listados como evidencia complementaria

Los listados ayudan a observar nombres, pero necesitan contexto.

### 24.1. Consulta completa

```bash
aws_local s3api list-buckets
```

### 24.2. Proyección de nombres

```bash
aws_local s3api list-buckets \
  --query 'Buckets[].Name' \
  --output json
```

### 24.3. Interpretación

La proyección reduce la respuesta mostrada.
No cambia los recursos.
No utilices búsquedas de subcadenas como prueba de identidad exacta.
Dos nombres parecidos pueden pertenecer a recursos distintos.

### 24.4. Criterio

Para esta práctica, la coincidencia debe ser exacta con `$BUCKET_NAME`.

---

## 25. Verificar etiquetas con `jq`

Una comprobación de propiedades necesita comparar claves y valores.

### 25.1. Guardar respuesta

```bash
aws_local s3api get-bucket-tagging \
  --bucket "$BUCKET_NAME" \
  > evidencias/bucket-tags.json
```

### 25.2. Comprobar valores requeridos

```bash
jq -e '
  [.TagSet[] | {key: .Key, value: .Value}]
  | from_entries
  | .Curso == "Terraform"
    and .Entorno == "LocalStack"
' evidencias/bucket-tags.json
```

### 25.3. Alcance

La expresión exige esos valores, pero permite etiquetas adicionales.
No constituye una comparación exacta del conjunto completo.

---

## 26. Comparación exacta de etiquetas

La igualdad completa debe ignorar únicamente el orden irrelevante.

### 26.1. Comprobación opcional

```bash
jq -e '
  (.TagSet | sort_by(.Key)) ==
  ([
    {"Key": "Curso", "Value": "Terraform"},
    {"Key": "Entorno", "Value": "LocalStack"}
  ] | sort_by(.Key))
' evidencias/bucket-tags.json
```

### 26.2. Diferencia de criterio

Esta expresión falla si existen etiquetas adicionales.
La anterior solo exige un subconjunto.
Ambas pueden ser correctas para objetivos distintos.

### 26.3. Decisión

Define si necesitas igualdad exacta o presencia de etiquetas obligatorias.
No cambies el criterio después de observar el resultado.
Documenta las etiquetas añadidas por configuración del provider si las hubiera.

---

## 27. Verificar metadatos del objeto

La consulta de metadatos no requiere descargar todo el contenido.

### 27.1. Ejecutar

```bash
aws_local s3api head-object \
  --bucket "$BUCKET_NAME" \
  --key "$OBJECT_KEY" \
  > evidencias/object-head.json
```

### 27.2. Consultar tamaño

```bash
jq '.ContentLength' evidencias/object-head.json
wc -c < materiales/mensaje.txt
```

### 27.3. Interpretación

Los tamaños deben ser coherentes con el archivo utilizado.
La igualdad de tamaños no demuestra igualdad de bytes.
Otros atributos pueden variar según operación y versión.
No conviertas el ETag en un MD5 universal.

---

## 28. Descargar y comparar contenido

La comprobación de bytes aporta una evidencia más fuerte sobre el contenido.

### 28.1. Descarga

```bash
aws_local s3api get-object \
  --bucket "$BUCKET_NAME" \
  --key "$OBJECT_KEY" \
  descargas/mensaje.txt \
  > evidencias/object-get.json
```

### 28.2. Comparación

```bash
cmp materiales/mensaje.txt descargas/mensaje.txt
resultado=$?
printf 'Resultado de cmp: %s\n' "$resultado"
```

### 28.3. Alcance

Un resultado correcto indica igualdad byte a byte.
No valida durabilidad, cifrado, replicación ni recuperación ante desastres.

---

## 29. JMESPath y formatos de salida

AWS CLI permite seleccionar partes de una respuesta mediante `--query`.

### 29.1. Ejemplo de claves

```bash
aws_local s3api list-objects-v2 \
  --bucket "$BUCKET_NAME" \
  --query 'Contents[].Key' \
  --output json
```

### 29.2. Uso práctico

JSON conserva una estructura adecuada para automatización.
Texto puede ser útil para valores sencillos.
Tabla facilita lectura humana, pero no suele ser la mejor entrada de un script.

### 29.3. Matices

`--query` utiliza JMESPath.
No es un filtro universal ejecutado por el servidor.
La interacción con paginación y formatos debe revisarse.
Una proyección vacía puede producir `null` según la respuesta y la expresión.

---

## 30. Paginación y resultados incompletos

Los listados pueden abarcar varias páginas.

### 30.1. Observación controlada

```bash
aws_local s3api list-objects-v2 \
  --bucket "$BUCKET_NAME" \
  --max-keys 1 \
  --no-paginate
```

### 30.2. Qué revisar

Busca indicadores de truncamiento y continuación.
Con un solo objeto, la demostración puede no mostrar varias páginas.
La ampliación necesitaría más objetos ficticios gestionados y una limpieza definida.

### 30.3. Distinciones

`--no-paginate` limita la recuperación automática de páginas.
`--max-keys` es un parámetro de la operación.
`--max-items` y `--page-size` tienen funciones de paginación del cliente.

### 30.4. Regla

No concluyas un inventario completo a partir de una sola página.

---

## 31. Script de verificación reproducible

El script comprobará existencia, etiquetas requeridas y contenido.

### 31.1. Archivo `scripts/verificar.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT"

source scripts/cliente-local.sh

for command_name in aws terraform jq cmp; do
  command -v "$command_name" >/dev/null 2>&1 || {
    printf 'Falta el comando: %s\n' "$command_name" >&2
    exit 1
  }
done
```

### 31.2. Contexto

El script fija el directorio del proyecto a partir de su ubicación.
No depende del directorio desde el que se invoque.

---

## 32. Completar el script de verificación

Añade este bloque al mismo archivo.

### 32.1. Comprobaciones

```bash
BUCKET_NAME=$(terraform output -raw bucket_name)
OBJECT_KEY=$(terraform output -raw object_key)

test -n "$BUCKET_NAME"
test -n "$OBJECT_KEY"

TMP_DIR=$(mktemp -d)
trap 'rm -rf -- "$TMP_DIR"' EXIT

aws_local s3api head-bucket --bucket "$BUCKET_NAME"

aws_local s3api get-bucket-tagging \
  --bucket "$BUCKET_NAME" > "$TMP_DIR/tags.json"

jq -e '
  [.TagSet[] | {key: .Key, value: .Value}]
  | from_entries
  | .Curso == "Terraform" and .Entorno == "LocalStack"
' "$TMP_DIR/tags.json" >/dev/null

aws_local s3api get-object \
  --bucket "$BUCKET_NAME" \
  --key "$OBJECT_KEY" \
  "$TMP_DIR/mensaje.txt" > "$TMP_DIR/get.json"

cmp materiales/mensaje.txt "$TMP_DIR/mensaje.txt"
printf 'Verificacion correcta: %s / %s\n' "$BUCKET_NAME" "$OBJECT_KEY"
```

---

## 33. Ejecutar y entender el script

La automatización debe revisarse antes de utilizarse.

### 33.1. Ejecución

```bash
bash scripts/verificar.sh
```

### 33.2. Resultado

El script termina correctamente solo si pasan sus comprobaciones.
Un fallo interrumpe la secuencia bajo las condiciones utilizadas.
La carpeta temporal se elimina al salir.

### 33.3. Límites

`set -e` tiene matices en Bash.
No sustituye el diseño explícito de controles de error.
El script no realiza inventario completo ni auditoría de seguridad.
Tampoco comprueba todas las propiedades del objeto.

### 33.4. Evidencia

Conserva versión del script, fecha y resultado.
No guardes únicamente la frase final sin contexto.

---

## 34. Drift controlado de etiquetas

La ampliación modifica externamente un atributo gestionado.

### 34.1. Condición

Realiza esta actividad solo en la instancia del ejercicio.
No cambies nombres ni elimines recursos.
El objetivo es observar diferencias, no provocar daños.

### 34.2. Modificación externa

```bash
aws_local s3api put-bucket-tagging \
  --bucket "$BUCKET_NAME" \
  --tagging '{"TagSet":[{"Key":"Curso","Value":"Terraform"},{"Key":"Entorno","Value":"Drift"}]}'
```

### 34.3. Semántica

La operación establece el conjunto enviado.
No añade una única etiqueta conservando automáticamente todas las anteriores.

### 34.4. Comprobación

Consulta las etiquetas y ejecuta el script.
La expectativa sobre `Entorno` debería dejar de cumplirse.

---

## 35. Detectar y corregir el drift

Terraform puede proponer restaurar el atributo declarado.

### 35.1. Revisar

```bash
terraform plan
```

### 35.2. Interpretar

Localiza la etiqueta modificada.
Comprueba que se propone una actualización y no un reemplazo inesperado.
Relaciona la diferencia con la operación externa documentada.

### 35.3. Restaurar

```bash
terraform apply
bash scripts/verificar.sh
```

### 35.4. Límite

No todas las modificaciones externas se detectan del mismo modo.
La detección depende del recurso, atributo y provider.
No extrapoles esta prueba a cambios de contenido u otras funcionalidades.

---

## 36. Ampliaciones SQS y DynamoDB

Estas actividades solo se ejecutan si la combinación del curso las admite.

### 36.1. Requisitos

Comprueba disponibilidad, modalidad y operaciones necesarias.
Añade endpoints específicos antes de planificar.
Define nombres diferentes y un procedimiento de limpieza.

### 36.2. Ajustes de configuración

Amplía `SERVICES` con los servicios autorizados.
Añade dentro del bloque `endpoints`:

```hcl
sqs      = "http://localhost:4566"
dynamodb = "http://localhost:4566"
```

### 36.3. Precaución

Una recreación sin persistencia puede perder datos locales.
Limpia el laboratorio principal antes si corresponde.
Declarar servicios no demuestra implementación completa.

---

## 37. Verificar una cola SQS

La cola debe haber sido creada por una actividad autorizada.

### 37.1. Obtener la URL

```bash
QUEUE_URL=$(aws_local sqs get-queue-url \
  --queue-name aula-verificacion-cola \
  --query 'QueueUrl' \
  --output text)
```

### 37.2. Consultar atributos

```bash
aws_local sqs get-queue-attributes \
  --queue-url "$QUEUE_URL" \
  --attribute-names QueueArn VisibilityTimeout
```

### 37.3. Interpretación

Comprueba la obtención correcta de la URL antes de continuar.
No sustituyas arbitrariamente la URL devuelta.
Los contadores aproximados no deben tratarse como conteos exactos.
Una prueba de recepción modifica la visibilidad del mensaje.

---

## 38. Verificar una tabla DynamoDB

La consulta debe identificar tabla, esquema y datos esperados.

### 38.1. Describir la tabla

```bash
aws_local dynamodb describe-table \
  --table-name aula-verificacion-tabla
```

### 38.2. Consultar un elemento conocido

```bash
aws_local dynamodb get-item \
  --table-name aula-verificacion-tabla \
  --key '{"id":{"S":"ejemplo-001"}}' \
  --consistent-read
```

### 38.3. Criterio

La tabla y el elemento deben proceder de una actividad documentada.
Una consulta satisfactoria sin `Item` no demuestra que el elemento exista.
La opción de lectura no certifica todas las garantías reales de consistencia.
No uses estas pruebas como evaluación de escalado o rendimiento.

---

## 39. Diagnóstico de verificaciones fallidas

Un fallo debe localizarse por capas antes de modificar el entorno.

### 39.1. Tabla orientativa

La tabla propone comprobaciones iniciales.

| **Síntoma** | **Comprobación** | **Conclusión que debes evitar** |
|-------------|------------------|--------------------------------|
| Conexión rechazada | Contenedor y puerto | Recurso inexistente |
| Error de firma | Credenciales y token heredado | Necesidad de claves reales |
| JSON inesperado | Operación y versión | Servicio completamente incompatible |
| Etiquetas distintas | Configuración y cambios externos | Fallo de red |
| Contenido distinto | Fuente y clave consultada | Pérdida de datos en AWS real |

Son hipótesis de trabajo, no causas confirmadas.

### 39.2. Secuencia

Registra el comando y el error saneado.
Comprueba contexto y entrada.
Cambia una condición relevante.
Repite y compara.

---

## 40. Sesión práctica A: existencia y propiedades

La primera sesión prepara el proyecto y sus evidencias básicas.

### 40.1. Duración y objetivo

Duración orientativa: 40 minutos, con herramientas instaladas.
Objetivo: comprobar un bucket y sus etiquetas desde AWS CLI.

### 40.2. Actividades

1. Prepara imagen y configuración.
2. Arranca LocalStack.
3. Despliega el bucket y el objeto.
4. Recupera identificadores desde Terraform.
5. Ejecuta `head-bucket`.
6. Consulta y compara etiquetas.
7. Registra las conclusiones.

### 40.3. Entregable

Entrega versiones, configuración y dos respuestas saneadas.
Explica qué demuestra cada comprobación.
Incluye una propiedad no evaluada.

---

## 41. Sesión práctica B: contenido y automatización

La segunda sesión transforma consultas manuales en una comprobación repetible.

### 41.1. Duración y objetivo

Duración orientativa: 35 minutos.
Objetivo: recuperar contenido y ejecutar el script de verificación.

### 41.2. Actividades

Consulta metadatos.
Descarga el objeto.
Compara bytes.
Escribe el script por bloques.
Revísalo por parejas.
Ejecútalo desde el proyecto y desde otro directorio.

### 41.3. Revisión

Una persona explica el código.
La otra identifica supuestos, efectos y límites.
Después intercambian funciones.

### 41.4. Entregable

Entrega el script y una explicación de sus criterios de aceptación.

---

## 42. Sesión práctica C: drift y diagnóstico

La tercera sesión comprueba una diferencia externa controlada.

### 42.1. Duración y objetivo

Duración orientativa: 30 minutos.
Objetivo: detectar una etiqueta incorrecta y restaurar la configuración.

### 42.2. Actividades

Ejecuta una verificación correcta.
Modifica la etiqueta autorizada.
Observa el fallo del criterio.
Genera un plan.
Explica el cambio propuesto.
Aplica y verifica otra vez.

### 42.3. Entregable

Conserva evidencias de antes, durante y después.
Distingue fallo de verificación y fallo de conectividad.
Añade una hipótesis descartada mediante una observación concreta.

### 42.4. Regla

No elimines recursos para generar errores adicionales.

---

## 43. Limpieza y comprobación final

Terraform gestionará la eliminación del objeto y del bucket principales.

### 43.1. Destruir

```bash
terraform plan -destroy
terraform destroy
terraform state list
```

### 43.2. Confirmar ausencia por nombre conservado

```bash
aws_local s3api list-buckets \
  > evidencias/buckets-final.json

jq -e --arg bucket "$BUCKET_NAME" '
  [.Buckets[].Name] | index($bucket) == null
' evidencias/buckets-final.json
```

### 43.3. Retirar el entorno

Comprueba primero que la consulta terminó correctamente.
Después ejecuta `docker compose down` si la instancia es exclusiva del proyecto.
No elimines recursos de otros equipos.

---

## 44. Evidencias, evaluación y resumen

La documentación final debe distinguir hechos, expectativas y aspectos pendientes.

### 44.1. Protección de archivos

No publiques estados, planes, tokens ni logs sensibles.
Conserva `.terraform.lock.hcl`, configuración y scripts revisados.
Un archivo ignorado puede seguir registrado si ya estaba en Git.
Revisa todas las evidencias antes de compartirlas.

### 44.2. Evaluación

Comprueba que puedes explicar existencia, propiedades y contenido.
Documenta comandos, versiones, criterios y limpieza.
Una operación no autorizada es un fallo crítico.
La verificación local no certifica permisos, costes ni garantías de AWS real.

### 44.3. Ideas esenciales

El estado y la API aportan evidencias diferentes.
Los listados pueden ser parciales y los errores requieren contexto.
Una consulta correcta solo demuestra el criterio definido.
**Verifica con preguntas concretas, compara resultados y limita tus conclusiones a lo observado.**