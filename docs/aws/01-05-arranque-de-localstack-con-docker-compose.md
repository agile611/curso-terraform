# Arranque de LocalStack con Docker Compose para un curso de Terraform

> Curso de Terraform con LocalStack emulando servicios de AWS.
> Los ejemplos de esta lección se ejecutan exclusivamente en un entorno local.
> No necesitas una cuenta de AWS para completar las prácticas.
> Utiliza credenciales ficticias y endpoints locales.
> Una comprobación satisfactoria en LocalStack no equivale a validar AWS real.

Esta lección prepara un servicio de LocalStack que puedas arrancar, comprobar y detener de forma controlada.
Docker Compose describirá el entorno.
AWS CLI permitirá verificar la API emulada.
Terraform completará una prueba de integración con un recurso S3.

El objetivo no es conseguir únicamente que un contenedor aparezca como iniciado.
El objetivo es comprender qué se ejecuta, dónde escucha y qué evidencias demuestran su disponibilidad.
También aprenderás a distinguir una parada, una recreación y una limpieza de recursos.

Los comandos del laboratorio se ejecutan en Bash.
Terraform y AWS CLI se ejecutan en el equipo anfitrión.
LocalStack se ejecuta dentro de Docker.
Esta arquitectura debe mantenerse durante la práctica principal.

---

## 1. Objetivos de aprendizaje

La lección combina preparación del entorno, observación y gestión del ciclo de vida.

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Explicar la función de Docker Compose.
- Diferenciar una imagen de un contenedor.
- Interpretar un mapeo de puertos.
- Distinguir disponibilidad del contenedor y disponibilidad de una API.
- Explicar el significado de `localhost`.
- Reconocer los límites de la emulación.

### 1.2. Objetivos prácticos

También podrás:

- Crear un archivo `compose.yaml`.
- Seleccionar una imagen concreta.
- Arrancar LocalStack.
- Consultar registros.
- Verificar S3 mediante AWS CLI.
- Conectar Terraform.
- Limpiar y detener el laboratorio.

---

## 2. Alcance de la práctica

El laboratorio se mantiene pequeño para facilitar la interpretación de sus resultados.

### 2.1. Componentes utilizados

Utilizaremos:

- Docker Engine o Docker Desktop.
- Docker Compose.
- Una imagen de LocalStack.
- AWS CLI versión 2.
- Terraform CLI.
- El provider de AWS.
- Bash y un editor de texto.

### 2.2. Servicios emulados

S3 será el servicio funcional de la práctica.
STS se incluirá entre los servicios y endpoints contemplados.
No se utilizarán recursos EC2, Lambda, RDS ni redes VPC.
Añadir esos servicios exige revisar compatibilidad y configuración.

### 2.3. Exclusiones

No se configurarán credenciales reales, políticas IAM ni backends remotos.
No se publicará el servicio en Internet.
No se montará el socket de Docker.
No se afirmará equivalencia completa con AWS.

---

## 3. Requisitos previos

Comprueba las herramientas antes de crear el archivo de Compose.

### 3.1. Comprobaciones iniciales

Ejecuta:

```bash
docker version
docker compose version
aws --version
terraform version
```

### 3.2. Qué debes observar

Docker debe mostrar información del cliente y del servidor.
Compose debe responder como plugin mediante `docker compose`.
AWS CLI debe corresponder a la versión requerida por el curso.
Terraform debe ser compatible con la configuración utilizada.

### 3.3. Condiciones del equipo

Necesitas conexión para descargar imágenes y providers cuando no estén disponibles.
Debes disponer de memoria y espacio suficientes.
En equipos administrados, utiliza el procedimiento autorizado.
No desactives controles de seguridad para resolver una instalación.

---

## 4. Política de versiones y compatibilidad

Las versiones son parte de la definición del laboratorio.

### 4.1. Información que debes registrar

Anota:

- Versión de Docker.
- Versión de Compose.
- Versión de AWS CLI.
- Versión de Terraform.
- Referencia de la imagen de LocalStack.
- Versión seleccionada del provider de AWS.

### 4.2. Selección docente

El docente debe proporcionar una referencia de LocalStack probada.
Esa referencia debe incluir una etiqueta concreta o un digest.
La combinación debe comprobarse con los ejercicios de esta página.
Esta documentación no afirma haber ejecutado esa validación.

### 4.3. Actualizaciones

No cambies de imagen a mitad de una comparación.
Una actualización puede modificar respuestas, registros y compatibilidad.
Si actualizas, registra el motivo.
Después repite las comprobaciones funcionales.

---

## 5. Arquitectura del laboratorio

La arquitectura determina cómo deben interpretarse las direcciones de conexión.

### 5.1. Recorrido de las solicitudes

```text
Equipo anfitrión
├── AWS CLI ──────────────────────┐
├── Terraform ── Provider AWS ────┤
└── Docker Compose               │
                                 ▼
                       127.0.0.1:4566
                                 │
                                 ▼
                      Contenedor LocalStack
                                 │
                                 ▼
                            API de S3
```

### 5.2. Separación de funciones

Compose gestiona el servicio local.
Terraform gestiona recursos mediante el provider.
AWS CLI realiza consultas independientes.
LocalStack recibe las solicitudes dirigidas a su endpoint.
Ninguno de estos componentes sustituye las responsabilidades de los demás.

---

## 6. Imagen, contenedor y servicio

Estos términos se relacionan, pero no significan lo mismo.

### 6.1. Imagen

Una imagen contiene los elementos necesarios para ejecutar el software.
Se identifica mediante una referencia de repositorio.
Puede seleccionarse con una etiqueta.
También puede identificarse mediante un digest.

### 6.2. Contenedor

Un contenedor es una instancia creada a partir de una imagen.
Tiene procesos, configuración y un ciclo de vida.
Puede detenerse sin eliminarse.
También puede eliminarse y recrearse.

### 6.3. Servicio de Compose

Un servicio es una declaración dentro del archivo de Compose.
Describe cómo ejecutar uno o varios contenedores.
En esta lección tendremos un servicio llamado `localstack`.
Ese nombre servirá para comandos de gestión y resolución de nombres en su red.

---

## 7. Qué aporta Docker Compose

Compose convierte opciones de ejecución en una configuración revisable.

### 7.1. Ventajas para el curso

Permite conservar:

- Imagen utilizada.
- Variables del contenedor.
- Publicación de puertos.
- Volúmenes, cuando correspondan.
- Nombre del proyecto.
- Procedimientos de arranque y parada.

### 7.2. Comparación básica

La tabla muestra diferencias de organización.

| **Aspecto** | **Comando aislado** | **Archivo Compose** |
|-------------|--------------------|---------------------|
| Configuración | Opciones en la terminal | Declaración en un archivo |
| Revisión | Revisar el comando completo | Revisar el YAML |
| Reutilización | Copiar o automatizar | Reutilizar el proyecto |
| Cambios | Editar argumentos | Editar y aplicar configuración |

Compose mejora la trazabilidad, pero no valida la seguridad del contenido.
El archivo debe revisarse antes de ejecutarlo.

---

## 8. Seguridad del entorno local

Un servicio local también necesita límites claros.

### 8.1. Reglas obligatorias

- Utiliza credenciales ficticias.
- Publica el puerto en `127.0.0.1`.
- No introduzcas datos personales.
- No copies estados de producción.
- No añadas secretos al repositorio.
- No ejecutes recursos de servicios no configurados.

### 8.2. Alcance del aislamiento

Publicar en la interfaz de bucle local limita el acceso directo desde otras interfaces.
No constituye una política completa de aislamiento.
Las redes, permisos y herramientas externas también influyen.
Otros procesos autorizados del equipo pueden acceder al servicio.

### 8.3. Criterio de detención

Detén la práctica ante endpoints inesperados.
Detente también si se solicitan credenciales reales.
Investiga antes de continuar.
No conviertas un fallo local en una prueba contra AWS real.

---

## 9. Preparar la carpeta de trabajo

Utiliza una carpeta exclusiva para esta unidad.

### 9.1. Crear la estructura

```bash
mkdir -p ~/cursos/terraform/arranque-localstack/evidencias
cd ~/cursos/terraform/arranque-localstack
```

### 9.2. Archivos previstos

```text
arranque-localstack/
├── compose.yaml
├── .env
├── .env.example
├── .gitignore
├── versions.tf
├── providers.tf
├── main.tf
├── outputs.tf
└── evidencias/
    └── registro.md
```

### 9.3. Regla de separación

No copies configuraciones o estados de otro proyecto.
Terraform interpreta conjuntamente los archivos `.tf` del módulo.
Un archivo olvidado puede añadir operaciones inesperadas.

---

## 10. Definir las variables de Compose

La configuración separará la referencia de imagen del archivo principal.

### 10.1. Archivo `.env.example`

Crea:

```dotenv
COMPOSE_PROJECT_NAME=aula-localstack
LOCALSTACK_IMAGE=localstack/localstack:ETIQUETA_PROBADA
LOCALSTACK_PORT=4566
```

### 10.2. Archivo local `.env`

Copia el ejemplo:

```bash
cp .env.example .env
```

### 10.3. Ajustes necesarios

Sustituye `ETIQUETA_PROBADA` por la referencia indicada por el docente.
No ejecutes el laboratorio conservando ese marcador.
Si utilizas un digest, escribe la referencia completa de la imagen.
Mantén el puerto predeterminado durante la práctica principal.

### 10.4. Nombre del proyecto

El nombre distingue los recursos de Compose.
No distingue automáticamente los recursos creados dentro de una misma instancia de LocalStack.

---

## 11. Crear el archivo `compose.yaml`

La configuración principal será deliberadamente mínima.

### 11.1. Contenido completo

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

### 11.2. Decisiones del ejemplo

No se declara `container_name`.
Compose generará nombres asociados al proyecto.
No se configura persistencia explícita.
No se monta el socket de Docker.
No se añaden mecanismos de reinicio automático.

### 11.3. Compatibilidad

El docente debe comprobar las variables admitidas por la imagen elegida.
También debe verificar los requisitos de su edición.
Si necesita autenticación, utilizará un mecanismo autorizado.
No debe añadir secretos al ejemplo compartido.

---

## 12. Interpretar el archivo Compose

Cada bloque tiene una función concreta.

### 12.1. Bloques principales

La tabla resume la configuración.

| **Bloque** | **Función** | **Comprobación** |
|------------|-------------|-----------------|
| `services` | Define servicios | Existe `localstack` |
| `image` | Selecciona software | Referencia concreta |
| `ports` | Publica un puerto | Interfaz local |
| `environment` | Configura el proceso | Variables admitidas |

El YAML describe cómo arrancar el servicio.
No crea un bucket S3.

### 12.2. Puerto interno y externo

El puerto del contenedor será `4566`.
El puerto del anfitrión será el valor de `LOCALSTACK_PORT`.
Ambos pueden ser diferentes.
Los clientes anfitriones deben utilizar el puerto publicado.

### 12.3. Orden del mapeo

La expresión representa dirección del anfitrión, puerto anfitrión y puerto del contenedor.
No inviertas esos valores.

---

## 13. Variables, sustitución y secretos

El archivo `.env` requiere una interpretación precisa.

### 13.1. Sustitución de Compose

Compose utiliza variables para resolver el archivo.
La expresión con `:?` exige un valor definido y no vacío.
La expresión con `:-` establece un valor predeterminado.
El resultado puede inspeccionarse antes del arranque.

### 13.2. Entorno del contenedor

Una variable en `.env` no entra automáticamente en el contenedor.
Debe utilizarse en la configuración correspondiente.
La sustitución del archivo y el entorno del proceso son mecanismos distintos.
No los confundas.

### 13.3. Secretos

`.env` no es un almacén seguro por sí mismo.
No publiques tokens dentro de él.
La salida de `docker compose config` puede revelar valores sustituidos.
Revisa esa salida antes de compartirla.

### 13.4. Práctica principal

Este laboratorio no necesita secretos reales.
La referencia de imagen y el puerto no son credenciales.

---

## 14. Validar antes de arrancar

La validación detecta errores de configuración, pero no garantiza funcionamiento.

### 14.1. Inspeccionar la configuración resuelta

```bash
docker compose config
```

### 14.2. Validación sin imprimir el contenido

```bash
docker compose config --quiet
```

### 14.3. Qué revisar

Comprueba:

- Imagen seleccionada.
- Nombre del servicio.
- Puerto anfitrión.
- Interfaz de publicación.
- Variables del contenedor.
- Ausencia de montajes inesperados.

### 14.4. Límites

Una configuración válida no demuestra que la imagen exista.
Tampoco prueba que el puerto esté libre.
No verifica todavía la API S3.
Es una comprobación previa, no una prueba completa.

---

## 15. Descargar la imagen seleccionada

La descarga separada facilita distinguir errores de red y de arranque.

### 15.1. Descargar

```bash
docker compose pull localstack
```

### 15.2. Qué puede ocurrir

Docker puede:

- Descargar capas nuevas.
- Reutilizar capas existentes.
- Solicitar autenticación.
- Fallar por conectividad.
- Rechazar una referencia inexistente.

### 15.3. Interpretación prudente

No cambies automáticamente a otra imagen.
Comprueba la referencia proporcionada por el curso.
Investiga errores de autenticación según la edición.
No añadas tokens personales para probar.

### 15.4. Registro

Anota la imagen solicitada y el resultado.
Si cambia la referencia, documenta el motivo.
No afirmes reproducibilidad basándote únicamente en que una descarga terminó.

---

## 16. Arrancar LocalStack en segundo plano

El primer arranque crea los recursos de Compose necesarios.

### 16.1. Ejecutar el arranque

```bash
docker compose up -d localstack
```

### 16.2. Consultar el estado

```bash
docker compose ps
```

### 16.3. Qué significa `-d`

El comando deja el servicio en segundo plano.
La terminal recupera el control.
El contenedor puede seguir inicializándose.
El proceso también puede terminar después del comando.

### 16.4. Interpretación

Un contenedor en ejecución es una primera evidencia.
No demuestra que S3 responda.
No demuestra compatibilidad con Terraform.
Las siguientes secciones añaden esas comprobaciones.

### 16.5. Regla

No encadenes inmediatamente operaciones de infraestructura sin comprobar disponibilidad.

---

## 17. Consultar los registros del servicio

Los registros ayudan a explicar arranque, errores y solicitudes.

### 17.1. Ver las últimas líneas

```bash
docker compose logs --tail=100 localstack
```

### 17.2. Seguir nuevos mensajes

```bash
docker compose logs -f --tail=50 localstack
```

### 17.3. Salir del seguimiento

Pulsa `Ctrl+C`.
Eso termina el seguimiento de registros.
No detiene el servicio arrancado en segundo plano.
Puedes comprobarlo con `docker compose ps`.

### 17.4. Qué buscar

Observa errores de configuración, autenticación o inicialización.
Relaciona los mensajes con el momento del arranque.
No presupongas un texto idéntico entre versiones.
Antes de compartir registros, revisa su contenido.

---

## 18. Comprobar el puerto publicado

La publicación debe coincidir con el endpoint de los clientes.

### 18.1. Consultar el mapeo

```bash
docker compose port localstack 4566
```

### 18.2. Resultado orientativo

Con la configuración principal, debe mostrarse un mapeo equivalente a:

```text
127.0.0.1:4566
```

### 18.3. Interpretación

La consulta identifica el puerto publicado.
No realiza una operación S3.
Si cambias `LOCALSTACK_PORT`, la salida debe reflejar el cambio.
Los comandos de AWS CLI y Terraform deberán adaptarse.

### 18.4. Error frecuente

Modificar `.env` no cambia inmediatamente un contenedor existente.
Hay que aplicar la configuración mediante Compose.
Un simple reinicio no aplica necesariamente la nueva publicación.

---

## 19. Consultar la salud de LocalStack

La consulta de salud complementa la observación del contenedor.

### 19.1. Definir el endpoint anfitrión

En Bash:

```bash
export LOCALSTACK_ENDPOINT="http://localhost:4566"
```

### 19.2. Consultar

```bash
curl --fail --silent --show-error \
  "${LOCALSTACK_ENDPOINT}/_localstack/health"
```

### 19.3. Interpretación

La estructura de la respuesta depende de la versión.
Algunos servicios pueden inicializarse al recibir su primera solicitud.
No conviertas una cadena concreta de la respuesta en un criterio universal.
Registra lo observado.

### 19.4. Límite principal

Una respuesta de salud no verifica todos los servicios.
La siguiente prueba realizará una consulta funcional a S3.
Esa consulta será la evidencia principal del laboratorio.

---

## 20. Preparar AWS CLI con credenciales ficticias

Utilizaremos una función para concentrar las opciones locales.

### 20.1. Función Bash

Define en la terminal:

```bash
aws_local() {
  AWS_ACCESS_KEY_ID=test \
  AWS_SECRET_ACCESS_KEY=test \
  AWS_SESSION_TOKEN= \
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

> **Nota:** No se establece `AWS_PROFILE` porque `AWS_CONFIG_FILE=/dev/null` ya ignora cualquier perfil configurado. Establecer `AWS_PROFILE=` (vacío) causa error en AWS CLI v2: "The config profile () could not be found".

### 20.2. Alcance

La función no modifica permanentemente las credenciales del usuario.
Debe definirse de nuevo en otra sesión de Bash.
El endpoint debe ser local.
No constituye una barrera general contra tráfico externo.

---

## 21. Verificar S3 mediante una consulta funcional

La consulta permite comprobar el servicio que utilizará Terraform.

### 21.1. Listar buckets

```bash
aws_local s3api list-buckets
```

### 21.2. Resultado inicial esperado

En una instancia limpia, no deberían aparecer buckets de prácticas anteriores.
Una lista vacía es un resultado correcto.
Si aparecen recursos, investiga si el entorno es compartido.
No los elimines automáticamente.

### 21.3. Qué demuestra

La consulta comprueba que:

- El cliente puede alcanzar el endpoint.
- La API S3 responde a esa operación.
- La configuración local permite ejecutar la solicitud.

### 21.4. Qué no demuestra

No prueba todas las operaciones S3.
No valida permisos reales de AWS.
No demuestra rendimiento ni disponibilidad productiva.

---

## 22. Esperar disponibilidad con un límite

El arranque puede necesitar unos segundos antes de responder.

### 22.1. Comprobación repetida

Con la función anterior definida:

```bash
s3_ready=false

for intento in 1 2 3 4 5 6 7 8 9 10; do
  if aws_local s3api list-buckets >/dev/null 2>&1; then
    s3_ready=true
    break
  fi
  sleep 2
done

if [ "$s3_ready" = true ]; then
  printf 'S3 responde a la consulta de disponibilidad.\n'
else
  printf 'S3 no respondió dentro del límite; revisa registros.\n'
  aws_local s3api list-buckets
fi
```

### 22.2. Interpretación

El bucle limita el número de intentos.
Cada solicitud también puede consumir tiempo.
El resultado solo verifica la operación utilizada.

---

## 23. Diferenciar niveles de disponibilidad

No todas las comprobaciones responden la misma pregunta.

### 23.1. Tabla de evidencias

| **Comprobación** | **Qué observa** | **Qué no garantiza** |
|-----------------|-----------------|----------------------|
| `docker compose ps` | Estado del contenedor | API funcional |
| Registros | Mensajes del proceso | Ausencia de errores futuros |
| Puerto publicado | Mapeo de red | Respuesta del servicio |
| Consulta de salud | Información del entorno | Compatibilidad completa |
| `list-buckets` | Operación S3 | Todas las operaciones |

La disponibilidad debe expresarse con alcance.
Evita la afirmación genérica de que todo funciona.

### 23.2. Redacción adecuada

Una evidencia puede decir:

```text
S3 respondió correctamente a list-buckets desde AWS CLI.
```

### 23.3. Redacción inadecuada

No escribas que LocalStack reproduce todo AWS.
Tampoco atribuyas a una consulta una validación de seguridad.

---

## 24. Healthchecks como ampliación opcional

Compose puede utilizar un healthcheck para observar una condición periódica.

### 24.1. Condición previa

El comando del healthcheck debe existir dentro de la imagen.
Comprueba sus dependencias con la referencia utilizada.
No copies una prueba que dependa de utilidades ausentes.
La consulta externa sigue siendo necesaria para el alumnado.

### 24.2. Qué puede comprobar

Un healthcheck puede ejecutar:

- Una consulta HTTP.
- Una comprobación del proceso.
- Una operación funcional.
- Un script previamente validado.

### 24.3. Límites

Un healthcheck no representa una auditoría.
Un contenedor puede seguir ejecutándose aunque se marque como no saludable.
No debe asumirse que Docker lo reiniciará automáticamente.
Ese comportamiento requiere mecanismos adicionales.

### 24.4. Decisión del laboratorio

La práctica principal utiliza comprobaciones externas explícitas.
Así evita depender de herramientas internas no verificadas.

---

## 25. Preparar Terraform para la integración

Terraform utilizará un endpoint configurable para S3.

### 25.1. Archivo `versions.tf`

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

### 25.2. Restricciones

La restricción de Terraform afecta a la CLI.
La restricción de AWS afecta al provider.
La inicialización seleccionará una versión compatible.
El archivo de bloqueo conservará la selección del provider.

### 25.3. Política

Estas restricciones son una base didáctica.
El curso debe documentar su combinación probada.
No actualices dependencias durante una comparación sin registrarlo.

---

## 26. Configurar el provider para LocalStack

La conexión debe quedar explícita y revisable.

### 26.1. Archivo `providers.tf`

```hcl
variable "localstack_endpoint" {
  description = "Endpoint local del laboratorio."
  type        = string
  default     = "http://localhost:4566"
}

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

### 26.2. Límite

Otros servicios necesitan endpoints y compatibilidad revisados.
Las opciones `skip_*` no proporcionan aislamiento de red.

---

## 27. Declarar el recurso de integración

El bucket permanecerá vacío para facilitar la limpieza.

### 27.1. Archivo `main.tf`

```hcl
resource "aws_s3_bucket" "arranque" {
  bucket        = "tf-arranque-localstack-001"
  force_destroy = false

  tags = {
    Curso   = "Terraform"
    Entorno = "LocalStack"
    Leccion = "ArranqueCompose"
  }
}
```

### 27.2. Archivo `outputs.tf`

```hcl
output "bucket_name" {
  description = "Bucket creado para comprobar la integración."
  value       = aws_s3_bucket.arranque.bucket
}
```

### 27.3. Separación

En una instancia compartida, acuerda nombres distintos.
No utilices datos personales.
No añadas objetos en la práctica principal.

---

## 28. Inicializar y revisar Terraform

La preparación y la revisión preceden a la creación.

### 28.1. Sincronizar el endpoint

```bash
export TF_VAR_localstack_endpoint="$LOCALSTACK_ENDPOINT"
```

### 28.2. Ejecutar comprobaciones

```bash
terraform init
terraform fmt
terraform validate
terraform plan
```

### 28.3. Qué revisar

Localiza `aws_s3_bucket.arranque`.
Comprueba el nombre previsto.
Comprueba las etiquetas.
Identifica valores conocidos después de aplicar.
Confirma que no aparecen recursos de otras prácticas.

### 28.4. Límites

`init` no demuestra que S3 esté disponible.
`validate` no verifica toda la API.
El plan debe interpretarse antes de continuar.

---

## 29. Aplicar y comprobar el recurso

La comprobación independiente cierra la prueba de integración.

### 29.1. Aplicar

```bash
terraform apply
```

Lee la propuesta antes de confirmar.
No utilices `-auto-approve` en esta sesión.

### 29.2. Consultar Terraform y S3

```bash
terraform output
terraform state list

aws_local s3api head-bucket \
  --bucket tf-arranque-localstack-001

aws_local s3api get-bucket-tagging \
  --bucket tf-arranque-localstack-001
```

### 29.3. Interpretación

Las salidas se apoyan en el estado.
AWS CLI consulta la API local.
`head-bucket` puede terminar sin mostrar contenido.
No atribuyas a esta prueba equivalencia con AWS real.

---

## 30. Comprender parada, inicio y reinicio

Los comandos de ciclo de vida tienen efectos diferentes.

### 30.1. Detener e iniciar

```bash
docker compose stop localstack
docker compose start localstack
```

### 30.2. Reiniciar

```bash
docker compose restart localstack
```

### 30.3. Comparación

La tabla resume el propósito de cada operación.

| **Comando** | **Propósito** | **Aplica cambios del YAML** |
|-------------|---------------|-----------------------------|
| `stop` | Detener contenedores | No |
| `start` | Iniciar contenedores existentes | No |
| `restart` | Reiniciar contenedores | No |
| `up -d` | Crear o reconciliar servicios | Puede recrearlos |

Los cambios de imagen, puertos o variables requieren revisar la configuración aplicada.
No uses `restart` como sustituto universal de `up`.

---

## 31. Recreación y persistencia

El ciclo de vida del contenedor no equivale al de los recursos Terraform.

### 31.1. Configuración principal

No se ha configurado persistencia explícita.
No debes asumir que los recursos sobreviven a una recreación.
Incluso tras un reinicio, la conservación debe comprobarse.
El comportamiento depende de versión y configuración.

### 31.2. Situación de divergencia

Puede ocurrir:

1. Terraform crea un bucket.
2. El estado registra el recurso.
3. LocalStack pierde su almacenamiento.
4. El estado sigue en el equipo.
5. El siguiente plan observa diferencias.

### 31.3. Procedimiento prudente

Consulta S3.
Genera un plan.
Explica las diferencias.
No borres el estado para ocultarlas.
No manipules el estado sin comprender sus efectos.

---

## 32. Persistencia como práctica avanzada

La persistencia debe diseñarse y comprobarse por separado.

### 32.1. Preguntas previas

Antes de configurarla, identifica:

- Opciones admitidas por la versión.
- Ruta de almacenamiento documentada.
- Edición requerida.
- Tipo de volumen.
- Política de eliminación.
- Compatibilidad de los datos entre versiones.

### 32.2. Prueba necesaria

Crea un recurso de prueba.
Detén el entorno.
Vuelve a iniciarlo.
Consulta la API.
Recrea únicamente si el procedimiento lo contempla.
Comprueba otra vez.

### 32.3. Criterio de aceptación

La prueba debe documentar cada transición.
No basta con afirmar que existe un volumen.
Un montaje no demuestra que la aplicación escriba allí sus datos.
No traslades datos entre versiones sin revisar compatibilidad.

---

## 33. Cambiar puertos y trabajar por equipos

Varias instancias en el mismo anfitrión necesitan puertos diferentes.

### 33.1. Ejemplo de segundo equipo

En su propia carpeta, un equipo puede utilizar:

```dotenv
COMPOSE_PROJECT_NAME=aula-equipo-b
LOCALSTACK_IMAGE=localstack/localstack:ETIQUETA_PROBADA
LOCALSTACK_PORT=4567
```

### 33.2. Endpoint correspondiente

En su terminal:

```bash
export LOCALSTACK_ENDPOINT="http://localhost:4567"
export TF_VAR_localstack_endpoint="$LOCALSTACK_ENDPOINT"
```

### 33.3. Condiciones

El marcador de imagen debe sustituirse.
Cada proyecto debe tener su propia carpeta y estado.
Un nombre de proyecto distinto no evita conflictos de puerto.
Un puerto distinto no evita conflictos dentro de una instancia compartida.
Documenta ambas formas de separación.

---

## 34. Diagnóstico de errores frecuentes

El diagnóstico debe partir de observaciones concretas.

### 34.1. Tabla de síntomas

| **Síntoma** | **Primera comprobación** | **Qué evitar** |
|-------------|--------------------------|----------------|
| Docker no responde | Arranque y contexto | Cambiar permisos globales |
| Imagen no encontrada | Referencia seleccionada | Usar `latest` sin revisión |
| Puerto ocupado | Mapeos y procesos | Detener servicios ajenos |
| S3 no responde | Endpoint y registros | Cambiar a AWS real |
| Terraform falla | Provider y configuración | Añadir credenciales reales |

La tabla orienta la investigación.
No confirma causas por sí sola.

### 34.2. Contexto de Docker

Consulta, si hay dudas:

```bash
docker context show
docker context ls
```

### 34.3. Precaución

Un contexto puede apuntar a otro motor.
Confirma que utilizas el entorno autorizado antes de crear o eliminar recursos.

---

## 35. Sesión práctica A: arrancar y demostrar disponibilidad

La primera sesión se centra en Compose y observación.

### 35.1. Duración y objetivo

Duración orientativa: 30 minutos, con herramientas ya instaladas.
Objetivo: demostrar que S3 responde desde el anfitrión.

### 35.2. Actividades

1. Crea la carpeta y `.env`.
2. Selecciona la imagen probada.
3. Escribe `compose.yaml`.
4. Valida la configuración.
5. Descarga y arranca.
6. Consulta estado, registros y puerto.
7. Ejecuta `list-buckets`.

### 35.3. Entregable

Entrega tres evidencias.
Explica qué demuestra cada una.
Incluye una limitación.
No sustituyas la consulta funcional por una captura del contenedor.
Registra el endpoint utilizado.

---

## 36. Sesión práctica B: integrar Terraform

La segunda sesión conecta el servicio local con infraestructura declarativa.

### 36.1. Duración y objetivo

Duración orientativa: 35 minutos.
Objetivo: crear y verificar un bucket mediante dos herramientas.

### 36.2. Actividades

1. Añade los archivos Terraform.
2. Sincroniza el endpoint.
3. Inicializa y valida.
4. Interpreta el plan.
5. Solicita revisión por parejas.
6. Aplica.
7. Consulta S3 desde AWS CLI.

### 36.3. Revisión por parejas

Una persona ejecuta.
La otra revisa antes de confirmar.
Después intercambian funciones.
Ambas deben distinguir estado y recurso observado.
El entregable incluye código y explicación, no solo salidas.

---

## 37. Sesión práctica C: interpretar una interrupción

La tercera sesión trabaja disponibilidad y recuperación sin destruir recursos arbitrariamente.

### 37.1. Duración y objetivo

Duración orientativa: 25 minutos.
Objetivo: explicar el efecto de detener y volver a iniciar el servicio.

### 37.2. Actividades

Consulta el bucket existente.
Detén LocalStack.
Repite la consulta y registra el error.
Inicia el servicio.
Espera disponibilidad.
Consulta nuevamente.
Genera un plan Terraform.

### 37.3. Interpretación

No presupongas que los datos se conservaron.
Si desaparecieron, explica la divergencia.
No borres el estado.
No apliques hasta revisar la propuesta.

### 37.4. Entregable

Entrega una cronología con comandos, resultados y decisiones.
Distingue indisponibilidad temporal y pérdida de recursos.

---

## 38. Limpieza controlada del laboratorio

La limpieza debe ocurrir antes de retirar el servicio.

### 38.1. Destruir recursos gestionados

Con LocalStack disponible:

```bash
terraform plan -destroy
terraform destroy
```

### 38.2. Verificar

```bash
terraform state list
aws_local s3api list-buckets
```

### 38.3. Detener y retirar Compose

Si la instancia es exclusiva del proyecto:

```bash
docker compose down
```

### 38.4. Precauciones

No uses `docker system prune` como limpieza de esta lección.
No elimines volúmenes ajenos.
`down` no sustituye la destrucción Terraform.
La eliminación de volúmenes requiere una decisión explícita cuando se utilizan.

---

## 39. Diferencias respecto a AWS real y evaluación

La práctica local enseña procedimientos con un alcance limitado.

### 39.1. Diferencias esenciales

LocalStack no representa una cuenta de AWS.
Las credenciales ficticias no son identidades reales.
Las pruebas no validan cuotas, costes ni disponibilidad de AWS.
Los permisos y comportamientos pueden diferir.
La compatibilidad depende de versión y edición.

### 39.2. Rúbrica inicial

Valora cada criterio entre cero y dos puntos.

| **Criterio** | **0 puntos** | **1 punto** | **2 puntos** |
|-------------|--------------|-------------|-------------|
| Configuración | No operativa | Requiere ajustes | Revisada y funcional |
| Disponibilidad | Sin comprobación | Evidencia parcial | Consulta funcional |
| Integración | No completa | Completa parcialmente | Creación y verificación |
| Seguridad | Incumple límites | Cumplimiento parcial | Respeta controles |
| Documentación | No reproducible | Faltan datos | Evidencias y versiones |

Una puntuación alta no compensa secretos expuestos o acciones no autorizadas.
Los fallos críticos deben tratarse por separado.

---

## 40. Registro, resumen y siguientes pasos

El entorno queda preparado cuando sus resultados pueden explicarse y repetirse.

### 40.1. Registro mínimo

Documenta:

- Fecha y versiones.
- Imagen y endpoint.
- Configuración utilizada.
- Comandos ejecutados.
- Evidencias de disponibilidad.
- Recurso creado.
- Errores e hipótesis.
- Limpieza verificada.
- Limitaciones pendientes.

### 40.2. Ideas principales

Compose describe el entorno, pero no valida toda su funcionalidad.
Un contenedor iniciado no equivale a una API disponible.
Los cambios requieren revisar el ciclo de vida.
La persistencia debe probarse, no suponerse.
Terraform y LocalStack conservan información en lugares diferentes.

### 40.3. Cierre

**Arranca, observa, consulta, integra y limpia con criterio.**
Este procedimiento será la base de las siguientes prácticas de Terraform.