# Configuración del provider de AWS para LocalStack con Terraform

> Curso de Terraform con LocalStack emulando servicios de AWS.
> Todas las prácticas de esta lección se realizan en un entorno local.
> Utiliza exclusivamente credenciales ficticias.
> No necesitas una cuenta de AWS para completar el laboratorio.
> Una ejecución satisfactoria en LocalStack no equivale a validar AWS real.

El provider de AWS permite que Terraform gestione recursos mediante APIs compatibles con los servicios de AWS.
En este laboratorio dirigiremos esas solicitudes a LocalStack mediante endpoints explícitos.
La sintaxis de los recursos seguirá siendo la del provider, pero el destino será un entorno de emulación local.

Configurar el provider no consiste únicamente en escribir una dirección.
También implica controlar credenciales, región, comprobaciones auxiliares y servicios utilizados.
Esta lección desarrolla esas decisiones y propone sesiones para comprobarlas con evidencias.

El laboratorio principal utiliza S3.
Las ampliaciones introducen SQS, aliases y módulos.
Las ampliaciones solo deben ejecutarse cuando el docente haya comprobado su compatibilidad.

---

## 1. Objetivos de aprendizaje

Esta unidad conecta la configuración de Terraform con el destino real de sus solicitudes.

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Diferenciar Terraform CLI y un provider.
- Explicar qué hace el provider de AWS.
- Identificar un endpoint por servicio.
- Distinguir credenciales ficticias y credenciales reales.
- Explicar las comprobaciones que se omiten en el laboratorio.

### 1.2. Objetivos prácticos

También podrás:

- Configurar un provider para LocalStack.
- Crear y verificar un bucket.
- Detectar endpoints incompletos.
- Interpretar errores de conexión.
- Pasar una configuración a un módulo.
- Limpiar recursos antes de detener el emulador.

---

## 2. Alcance de la lección

El laboratorio está diseñado para comprender una conexión concreta y revisable.

### 2.1. Componentes utilizados

Trabajaremos con:

- Terraform CLI.
- Provider `hashicorp/aws`.
- Docker Compose.
- LocalStack.
- AWS CLI versión 2.
- Bash.

### 2.2. Servicios previstos

S3 será el servicio principal.
STS aparecerá como endpoint auxiliar.
SQS será una ampliación opcional.
No se utilizarán recursos de otros servicios sin revisar sus conexiones.

### 2.3. Exclusiones

No configuraremos credenciales reales, backends remotos ni permisos IAM productivos.

---

## 3. Requisitos previos

Comprueba el entorno antes de crear archivos.

### 3.1. Conocimientos necesarios

Debes saber:

- Crear carpetas.
- Editar archivos HCL.
- Ejecutar Docker Compose.
- Identificar un puerto local.
- Interpretar un plan sencillo.
- Diferenciar configuración y estado.

### 3.2. Comprobaciones

```bash
terraform version
docker version
docker compose version
aws --version
```

### 3.3. Criterio de avance

Docker debe mostrar un servidor disponible.
Los ejecutables deben corresponder a las versiones previstas por el curso.

---

## 4. Versiones y compatibilidad

Las opciones de un provider dependen de su versión.

### 4.1. Base didáctica

Esta página utilizará:

- Terraform desde 1.6 y anterior a 2.0.
- Provider de AWS dentro de la serie 5.
- Una imagen de LocalStack seleccionada por el docente.

Estas restricciones no representan las versiones más recientes.
La configuración debe probarse antes de impartir la sesión.

### 4.2. Información que debes registrar

Anota:

- Terraform CLI.
- Provider seleccionado.
- Imagen y modalidad de LocalStack.
- Docker y Compose.
- AWS CLI.
- Sistema y arquitectura.

### 4.3. Actualizaciones

Una actualización exige revisar el esquema y repetir las pruebas relevantes.

---

## 5. Qué es un provider

Un provider es un componente que integra Terraform con una API o plataforma.

### 5.1. Responsabilidades

El provider define:

- Tipos de recursos.
- Fuentes de datos.
- Atributos admitidos.
- Validaciones.
- Operaciones de creación y actualización.
- Consultas de seguimiento.

### 5.2. Relación con Terraform

Terraform coordina la evaluación y las operaciones.
El provider implementa la interacción específica con el servicio.
Ambos tienen versiones independientes.
Instalar Terraform no instala automáticamente todos los providers.

### 5.3. Consecuencia práctica

Un recurso puede depender de comportamientos del provider además de los de LocalStack.

---

## 6. Provider de AWS frente a LocalStack

LocalStack no sustituye al provider de AWS en esta configuración.

### 6.1. Cadena de componentes

```text
Archivos HCL
    ↓
Terraform CLI
    ↓
Provider hashicorp/aws
    ↓
Endpoint local
    ↓
LocalStack
```

### 6.2. Sintaxis y destino

El recurso seguirá llamándose `aws_s3_bucket`.
Su sintaxis pertenece al provider.
El endpoint determina el destino de las solicitudes S3.
El prefijo `aws_` no demuestra que se esté usando AWS real.

### 6.3. Regla esencial

Comprueba el destino mediante configuración y evidencias, no mediante el nombre del recurso.

---

## 7. Declaración y configuración del provider

Terraform separa la dependencia del provider y su configuración operativa.

### 7.1. Declaración de dependencia

`required_providers` indica qué provider necesita el módulo.
Incluye su dirección de origen.
Puede incorporar una restricción de versión.

### 7.2. Configuración operativa

El bloque `provider "aws"` define opciones de conexión.
Incluye región y credenciales.
También puede incluir endpoints y ajustes específicos.

### 7.3. Comparación

| **Elemento** | **Pregunta que responde** | **Ejemplo** |
|--------------|---------------------------|-------------|
| Dependencia | ¿Qué plugin necesito? | `hashicorp/aws` |
| Restricción | ¿Qué versiones admito? | Serie 5 |
| Configuración | ¿Cómo debe conectarse? | Endpoint local |

Declarar una dependencia no configura automáticamente un destino local.

---

## 8. Credenciales, región y endpoint

Estos valores cumplen funciones diferentes.

### 8.1. Credenciales

Utilizaremos `test` como clave y secreto.
Son valores ficticios para el laboratorio.
No representan una identidad válida de AWS.

### 8.2. Región

Utilizaremos `us-east-1`.
La región interviene en configuración y firma de solicitudes.
No convierte el emulador en una región real.

### 8.3. Endpoint

El endpoint será `http://localhost:4566`.
Indica dónde se envían las solicitudes del servicio configurado.
Debe coincidir con el puerto publicado por Docker.

### 8.4. Idea principal

Credenciales ficticias y región local de referencia no sustituyen un endpoint explícito.

---

## 9. Configuración por servicio

El bloque de endpoints debe corresponder a los servicios utilizados.

### 9.1. Ejemplo conceptual

```hcl
endpoints {
  s3  = "http://localhost:4566"
  sts = "http://localhost:4566"
}
```

### 9.2. Alcance

La configuración contempla S3 y STS.
No debes asumir que todos los servicios quedan redirigidos.
Un recurso SQS exige revisar el endpoint SQS.
Un recurso DynamoDB exige revisar el endpoint DynamoDB.

### 9.3. Riesgo

Un servicio sin endpoint personalizado puede utilizar el destino predeterminado del provider.
Las credenciales ficticias no constituyen un cortafuegos.
La prevención requiere revisar recursos, endpoints y controles externos.

### 9.4. Criterio de ampliación

Añade servicios de forma deliberada, no copiando bloques arbitrarios.

---

## 10. Seguridad del laboratorio

El aislamiento requiere varias medidas complementarias.

### 10.1. Medidas principales

- Publicar LocalStack en `127.0.0.1`.
- Utilizar credenciales ficticias.
- Declarar endpoints locales.
- Limitar los tipos de recursos.
- Revisar todos los archivos `.tf`.
- Confirmar el contexto de Docker.

### 10.2. Datos prohibidos

No introduzcas:

- Claves reales.
- Tokens personales.
- Estados de producción.
- Documentos confidenciales.
- Información personal innecesaria.

### 10.3. Detención

Detén la práctica ante destinos inesperados o solicitudes de credenciales reales.

---

## 11. Arquitectura de ejecución

La práctica principal ejecuta los clientes en el anfitrión.

### 11.1. Distribución

```text
Equipo anfitrión
├── Terraform
├── AWS CLI
└── Docker
    └── Contenedor LocalStack
```

### 11.2. Significado de `localhost`

Desde el anfitrión, `localhost` identifica el propio anfitrión.
Docker publica allí el puerto del contenedor.
Desde otro contenedor, `localhost` identifica ese otro contenedor.
La misma cadena no representa necesariamente el mismo destino.

### 11.3. Regla del curso

No mezcles instrucciones de ejecución anfitriona y contenerizada.
Una arquitectura diferente requiere endpoints diferentes y documentación propia.

---

## 12. Organización del proyecto

Separaremos configuración, entorno y evidencias.

### 12.1. Crear carpetas

```bash
mkdir -p ~/cursos/terraform/provider-localstack/evidencias
cd ~/cursos/terraform/provider-localstack
```

### 12.2. Estructura inicial

```text
provider-localstack/
├── compose.yaml
├── .env
├── .env.example
├── versions.tf
├── variables.tf
├── providers.tf
├── main.tf
├── outputs.tf
├── .gitignore
└── evidencias/
    └── registro.md
```

---

## 13. Seleccionar la imagen de LocalStack

El curso debe proporcionar una referencia concreta y probada.

### 13.1. Archivo `.env.example`

```dotenv
COMPOSE_PROJECT_NAME=aula-provider
LOCALSTACK_IMAGE=localstack/localstack:ETIQUETA_PROBADA
```

### 13.2. Crear `.env`

```bash
cp .env.example .env
```

### 13.3. Sustituir el marcador

Edita `.env`.
Reemplaza `ETIQUETA_PROBADA` por la referencia autorizada.
No continúes conservando el marcador.
No cambies automáticamente a `latest`.

### 13.4. Modalidad

El docente debe comprobar disponibilidad de S3 y requisitos de autenticación.
Si se requiere un token, se gestionará como secreto.

---

## 14. Arrancar LocalStack con Compose

El laboratorio principal contempla S3 y STS.

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

No configuramos persistencia ni montamos el socket de Docker.

---

## 15. Observar el servicio local

La disponibilidad debe comprobarse antes de aplicar Terraform.

### 15.1. Consultas auxiliares

```bash
docker compose logs --tail=100 localstack
docker compose port localstack 4566
```

### 15.2. Endpoint de salud

```bash
curl --fail --silent --show-error \
  http://localhost:4566/_localstack/health
```

### 15.3. Interpretación

El estado del contenedor no garantiza una API funcional.
La respuesta de salud depende de la versión.
No exijas una estructura idéntica entre imágenes.
La consulta S3 independiente aportará una comprobación adicional.

### 15.4. Precaución

No cambies a AWS real para resolver un error de conexión local.

---

## 16. Restricciones en `versions.tf`

La dependencia debe quedar explícita.

### 16.1. Archivo completo

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

### 16.2. Interpretación

`~> 5.0` permite versiones de la serie 5.
No selecciona necesariamente la versión 5.0.0.
La inicialización utiliza también el archivo de bloqueo existente.

### 16.3. Regla

No amplíes restricciones para ocultar una incompatibilidad sin investigar.

---

## 17. Variables del módulo raíz

Las entradas permitirán cambiar nombre, región y endpoint.

### 17.1. Archivo `variables.tf`

```hcl
variable "aws_region" {
  description = "Region de referencia del laboratorio."
  type        = string
  default     = "us-east-1"
}

variable "localstack_endpoint" {
  description = "Endpoint local del emulador."
  type        = string
  default     = "http://localhost:4566"
}

variable "bucket_name" {
  description = "Nombre del bucket local."
  type        = string
  default     = "aula-provider-localstack-001"
}
```

---

## 18. Validación educativa del endpoint

Una validación puede reducir errores de entrada, aunque no garantiza aislamiento completo.

### 18.1. Bloque opcional

Añádelo dentro de `localstack_endpoint`:

```hcl
validation {
  condition = contains(
    [
      "http://localhost:4566",
      "http://127.0.0.1:4566"
    ],
    var.localstack_endpoint
  )
  error_message = "Esta practica solo admite el endpoint local del puerto 4566."
}
```

### 18.2. Alcance

La lista restringe las entradas de esta práctica.
No verifica proxy, red, procesos ni comportamiento del cliente.
Una arquitectura contenerizada necesitaría otra validación.
No elimines el control sin documentar el cambio.

---

## 19. Configuración completa en `providers.tf`

Este bloque conecta el provider con LocalStack.

### 19.1. Archivo completo

```hcl
provider "aws" {
  region     = var.aws_region
  access_key = "test"
  secret_key = "test"

  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_region_validation      = true
  skip_requesting_account_id  = true

  s3_use_path_style = true

  endpoints {
    s3  = var.localstack_endpoint
    sts = var.localstack_endpoint
  }
}
```

### 19.2. Revisión

Comprueba que los valores siguen siendo ficticios y los endpoints locales.

---

## 20. `skip_credentials_validation`

Esta opción omite una validación inicial concreta de credenciales del provider.

### 20.1. Motivo en el laboratorio

Las credenciales `test` no pertenecen a AWS.
No queremos validar su identidad contra AWS real.
El laboratorio utiliza una API emulada.

### 20.2. Lo que no significa

La opción no implica:

- Desactivar toda autenticación del emulador.
- Evitar todas las solicitudes STS posibles.
- Bloquear tráfico externo.
- Validar permisos reales.
- Garantizar seguridad.

### 20.3. Criterio de revisión

Consulta el comportamiento de la versión elegida.
No conviertas el nombre de una opción en una garantía más amplia.

---

## 21. `skip_metadata_api_check`

Esta opción evita determinadas comprobaciones relacionadas con metadatos de instancia.

### 21.1. Contexto

En AWS, algunos entornos proporcionan credenciales mediante mecanismos de identidad.
El laboratorio no depende de una instancia EC2.
Las credenciales ficticias se declaran explícitamente.

### 21.2. Utilidad práctica

Omitir comprobaciones innecesarias puede evitar demoras o accesos auxiliares.
El efecto exacto debe revisarse en la versión utilizada.
No atribuyas cualquier demora a metadatos sin evidencia.

### 21.3. Diferencia frente a AWS CLI

La configuración del provider no modifica AWS CLI.
AWS CLI necesita su propio entorno y endpoint.
La variable usada por un cliente no sustituye las opciones del otro.

### 21.4. Regla

Mantén separadas las configuraciones de cada herramienta.

---

## 22. `skip_region_validation`

Esta opción omite la validación inicial de región del provider.

### 22.1. Qué cambia

El provider no realiza esa comprobación concreta.
La región sigue configurada.
Puede seguir interviniendo en firma, solicitudes y atributos.

### 22.2. Qué no cambia

No se elimina la región del sistema.
No se unifican automáticamente todos los recursos regionales.
No se garantiza cualquier nombre inventado de región.

### 22.3. Decisión del curso

Utilizamos `us-east-1` para reducir variaciones.
No introduzcas regiones ficticias para demostrar que la opción existe.
Si una actividad necesita varias regiones, debe tener pruebas específicas.

### 22.4. Evidencia

Registra región, servicio y operación comprobada.

---

## 23. `skip_requesting_account_id`

Esta opción omite la obtención del identificador de cuenta durante la configuración correspondiente.

### 23.1. Motivo

El laboratorio no utiliza una cuenta real.
Algunas consultas auxiliares de identidad no son necesarias para el recurso básico.

### 23.2. Límites

Determinados recursos o funcionalidades pueden necesitar información de cuenta.
Omitir una consulta no elimina esa necesidad.
La compatibilidad depende de las operaciones del provider.

### 23.3. No fijar una cuenta universal

Los identificadores locales pueden depender de configuración y credenciales.
No uses un valor observado como garantía para todas las instalaciones.
Comprueba el entorno concreto.

### 23.4. Ejercicio conceptual

Explica por qué una opción útil para S3 básico puede no bastar para otro recurso.

---

## 24. `s3_use_path_style`

S3 admite modalidades distintas de direccionamiento.

### 24.1. Direccionamiento por ruta

Conceptualmente:

```text
http://localhost:4566/nombre-del-bucket/objeto.txt
```

### 24.2. Direccionamiento por host

Conceptualmente:

```text
http://nombre-del-bucket.servidor/objeto.txt
```

### 24.3. Decisión del laboratorio

El estilo por ruta reduce dependencias de resolución de nombres.
Se configura explícitamente para facilitar la práctica.
No demuestra que otras modalidades sean imposibles.
Su utilización en AWS real debe revisarse según el contexto.

### 24.4. Diagnóstico

Un error DNS puede estar relacionado con la modalidad de direccionamiento.

---

## 25. Recursos y salidas del laboratorio

El bucket permanecerá vacío durante la práctica principal.

### 25.1. Archivo `main.tf`

```hcl
resource "aws_s3_bucket" "laboratorio" {
  bucket        = var.bucket_name
  force_destroy = false

  tags = {
    Curso   = "Terraform"
    Entorno = "LocalStack"
    Unidad  = "ProviderAWS"
  }
}
```

### 25.2. Archivo `outputs.tf`

```hcl
output "bucket_name" {
  value = aws_s3_bucket.laboratorio.bucket
}
```

---

## 26. Inicialización y esquema del provider

La inicialización prepara el plugin que utilizará el proyecto.

### 26.1. Comandos

```bash
terraform init
terraform providers
terraform providers schema -json > evidencias/provider-schema.json
```

### 26.2. Qué observar

La inicialización muestra la selección del provider.
`terraform providers` identifica dependencias de configuración y estado.
El esquema permite revisar atributos y tipos.
El archivo generado puede ser extenso.

### 26.3. Alcance

El esquema no demuestra compatibilidad con LocalStack.
Tampoco sustituye la documentación del comportamiento.
No modifica recursos por sí mismo.

### 26.4. Registro

Conserva la versión efectiva y no solo la restricción escrita.

---

## 27. Formato, validación y planificación

Estas comprobaciones resuelven preguntas diferentes.

### 27.1. Ejecutar

```bash
terraform fmt
terraform validate
terraform plan
```

### 27.2. Interpretación

`fmt` organiza el código.
`validate` comprueba aspectos de configuración.
`plan` evalúa cambios propuestos utilizando el provider.
Ninguno equivale a una auditoría completa.

### 27.3. Revisar el primer plan

Debe aparecer `aws_s3_bucket.laboratorio`.
El nombre debe coincidir con la entrada efectiva.
No deberían aparecer recursos de otros servicios.
Los valores desconocidos no deben completarse con suposiciones.

### 27.4. Detención

Un recurso inesperado obliga a revisar todos los archivos del módulo.

---

## 28. AWS CLI para una verificación independiente

El cliente utilizará su propia configuración local.

### 28.1. Función Bash

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

### 28.2. Primera consulta

```bash
aws_local s3api list-buckets
```

---

## 29. Aplicación y comprobación del bucket

La creación debe acompañarse de evidencia del servicio.

### 29.1. Aplicar

```bash
terraform apply
```

Lee el plan antes de confirmar.
No utilices `-auto-approve` en esta sesión.

### 29.2. Consultar

```bash
terraform output
terraform state list

aws_local s3api head-bucket \
  --bucket aula-provider-localstack-001

aws_local s3api get-bucket-tagging \
  --bucket aula-provider-localstack-001
```

### 29.3. Interpretación

Adapta el nombre si cambiaste la variable.
Una consulta de existencia correcta puede no imprimir contenido.

---

## 30. Variables de entorno y perfiles heredados

El entorno del proceso puede añadir información a la configuración.

### 30.1. Riesgo

Una terminal utilizada para otro proyecto puede conservar:

- Región.
- Token temporal.
- Perfil.
- Rutas de credenciales.
- Configuración de proxy.
- Otras opciones de los clientes.

### 30.2. Procedimiento

Utiliza una terminal dedicada al curso.
No exportes credenciales reales.
Revisa el mecanismo efectivo de cada herramienta.
No imprimas secretos para comprobar que existen.

### 30.3. Tokens temporales

Un token heredado puede producir resultados inesperados.
Su tratamiento debe revisarse en la combinación utilizada.
La configuración explícita del ejemplo no debe considerarse un aislamiento universal.

---

## 31. Diagnóstico de conectividad

Un error de conexión necesita observaciones concretas.

### 31.1. Tabla orientativa

| **Síntoma** | **Comprobación** | **Qué evitar** |
|-------------|------------------|----------------|
| Conexión rechazada | Contenedor y puerto | Cambiar a AWS real |
| Tiempo agotado | Red, proxy y endpoint | Reintentar indefinidamente |
| Error DNS | Host y estilo S3 | Añadir credenciales reales |
| Puerto ocupado | Mapeos existentes | Detener servicios ajenos |
| API no disponible | Imagen y registros | Asumir ausencia del servicio |

La tabla orienta la investigación.
No confirma una causa por sí sola.

### 31.2. Secuencia

Registra el comando y el error saneado.
Comprueba Docker, endpoint y versión.
Formula una hipótesis.
Cambia una condición relevante y repite.

---

## 32. Diagnóstico de configuración y credenciales

No todos los errores pertenecen a la red.

### 32.1. Errores posibles

Puedes encontrar:

- Atributo no admitido.
- Bloque mal ubicado.
- Restricción incompatible.
- Firma rechazada.
- Región inesperada.
- Consulta auxiliar no soportada.

### 32.2. Comprobaciones

Revisa el esquema de la versión instalada.
Comprueba credenciales ficticias y endpoint.
Identifica qué operación estaba realizando el provider.
Contrasta el error con los registros disponibles.

### 32.3. Regla

No resuelvas una firma inválida introduciendo claves reales.
No elimines todas las opciones sin saber cuál produce el problema.
Mantén cambios pequeños y documentados.

---

## 33. Logs de Terraform y datos sensibles

Los registros detallados pueden ayudar, pero necesitan protección.

### 33.1. Uso puntual

Si está autorizado:

```bash
TF_LOG=DEBUG \
TF_LOG_PATH="$PWD/evidencias/terraform-debug.log" \
terraform plan
```

### 33.2. Precauciones

Los logs pueden contener datos sensibles.
Revisa su contenido antes de compartirlo.
No los publiques íntegros.
No actives el nivel más detallado por defecto.

### 33.3. Evidencia limitada

Un log ayuda a identificar operaciones y destinos.
No es una garantía universal de aislamiento.
Los controles externos siguen siendo relevantes.

---

## 34. Endpoints incompletos: ejercicio preventivo

La prevención consiste en detectar el problema antes de ejecutar.

### 34.1. Caso ficticio

```hcl
resource "aws_sqs_queue" "ejemplo" {
  name = "aula-cola"
}
```

El provider principal solo declara endpoints S3 y STS.

### 34.2. Análisis

Identifica el servicio del recurso.
Comprueba si tiene un endpoint local.
Consulta disponibilidad en la edición elegida.
Revisa operaciones auxiliares del provider.
Define limpieza.

### 34.3. Regla

No ejecutes el fragmento para averiguar a dónde apunta.
Un plan también puede realizar solicitudes.
La revisión debe preceder a la operación.

---

## 35. Ampliación opcional con SQS

La ampliación requiere autorización y compatibilidad comprobada.

### 35.1. Ajuste de Compose

Amplía los servicios contemplados:

```yaml
environment:
  SERVICES: s3,sts,sqs
  AWS_DEFAULT_REGION: us-east-1
```

### 35.2. Ajuste del provider

Añade dentro de `endpoints`:

```hcl
sqs = var.localstack_endpoint
```

### 35.3. Condiciones

Limpia recursos antes de una recreación si no hay persistencia.
No presupongas conservación del bucket.
Reaplica Compose y comprueba disponibilidad.
Declarar un servicio no concede acceso a funcionalidades restringidas.

---

## 36. Recurso SQS y verificación

La cola se incorporará al mismo módulo.

### 36.1. Declaración opcional

```hcl
resource "aws_sqs_queue" "laboratorio" {
  name = "aula-provider-cola-001"
}
```

### 36.2. Revisión

```bash
terraform fmt
terraform validate
terraform plan
terraform apply
```

### 36.3. Consulta externa

```bash
aws_local sqs list-queues \
  --queue-name-prefix aula-provider
```

### 36.4. Alcance

La creación no valida todas las garantías de entrega de mensajes.

---

## 37. Configuraciones con alias

Un alias permite disponer de otra configuración del mismo provider.

### 37.1. Uso conceptual

Puedes necesitar:

- Otro endpoint local.
- Otra región de referencia.
- Otra instancia de LocalStack.
- Una configuración específica para un módulo.

### 37.2. Distinción

Un alias no es otro plugin.
No genera automáticamente otro estado.
No constituye una barrera de seguridad.
Los recursos deben seleccionar la configuración adecuada.

### 37.3. Regla del curso

Las configuraciones del ejercicio seguirán siendo locales.
No utilizaremos un alias apuntando a AWS real.
La ampliación se realizará después de completar el laboratorio principal.

---

## 38. Selección explícita de un alias

La selección ocurre en el recurso o en el mapeo del módulo.

### 38.1. Fragmento ilustrativo

```hcl
resource "aws_s3_bucket" "alternativo" {
  provider = aws.local_alternativo
  bucket   = "aula-provider-alternativo-001"
}
```

### 38.2. Condición

El fragmento necesita una configuración `aws` con alias `local_alternativo`.
No lo añadas aislado esperando que Terraform la cree.
Esa configuración debe repetir o definir los ajustes locales necesarios.

### 38.3. Precaución

Un provider con alias no hereda automáticamente todas las opciones del predeterminado.
Revisa cada bloque por separado.
Si todas las configuraciones tienen alias, evita recursos que dependan de un predeterminado implícito vacío.

### 38.4. Ejercicio

Marca qué recursos utilizan cada configuración.

---

## 39. Providers y módulos hijos

Los módulos necesitan declarar sus dependencias.

### 39.1. Configuración recomendada

El módulo raíz conserva endpoints y credenciales.
El módulo hijo declara `required_providers`.
El recurso interno utiliza la configuración recibida.
Así se separa implementación de conexión.

### 39.2. Herencia

Una configuración predeterminada puede heredarse según las reglas de Terraform.
Las configuraciones con alias necesitan un mapeo explícito.
El módulo debe declarar los aliases que espera cuando corresponda.

### 39.3. Evitar

No escribas claves reales dentro de módulos reutilizables.
No conviertas el endpoint local en una dependencia oculta.
No copies bloques de provider sin una necesidad concreta.

### 39.4. Criterio

La interfaz del módulo debe permitir entender cómo obtiene su conexión.

---

## 40. Mapeo explícito hacia un módulo

El módulo puede recibir una configuración seleccionada por el módulo raíz.

### 40.1. Ejemplo conceptual

```hcl
module "bucket" {
  source = "./modules/bucket"

  providers = {
    aws = aws
  }

  bucket_name = "aula-modulo-provider-001"
}
```

### 40.2. Lectura

La clave izquierda identifica el provider esperado por el hijo.
La referencia derecha selecciona una configuración del padre.
Puede sustituirse por un alias declarado.

### 40.3. Condición

El directorio del módulo y su interfaz deben existir.
No ejecutes este fragmento como si fuera un proyecto completo.

---

## 41. Cambios de provider y estado

El estado conserva información relacionada con las configuraciones utilizadas.

### 41.1. Riesgo

Eliminar un bloque de provider demasiado pronto puede impedir operaciones pendientes.
Cambiar un endpoint puede dirigir la gestión hacia otro entorno.
Un recurso registrado no se traslada físicamente por editar una dirección.

### 41.2. Procedimiento prudente

Consulta el estado.
Identifica recursos asociados.
Planifica el cambio.
Comprueba el entorno de destino.
Mantén las configuraciones necesarias para limpiar o migrar.

### 41.3. Qué no hacer

No copies un estado para mezclar instancias.
No borres el estado para ocultar un error.
No utilices comandos de sustitución o movimiento sin comprender su alcance.

---

## 42. Sesión práctica A: conectar S3

La primera sesión construye y verifica la configuración principal.

### 42.1. Duración y objetivo

Duración orientativa: 40 minutos.
Objetivo: crear un bucket mediante un provider local.

### 42.2. Actividades

1. Prepara archivos y versiones.
2. Arranca LocalStack.
3. Define AWS CLI local.
4. Consulta S3.
5. Inicializa Terraform.
6. Revisa el plan por parejas.
7. Aplica y verifica.

### 42.3. Entregable

Entrega configuración, versión efectiva y dos evidencias.
Explica el papel de cada endpoint.
Añade una limitación de la prueba.

---

## 43. Sesión práctica B: interpretar opciones

La segunda sesión trabaja comprensión sin introducir destinos reales.

### 43.1. Duración y objetivo

Duración orientativa: 25 minutos.
Objetivo: explicar cada opción del provider y sus límites.

### 43.2. Actividades

Una persona presenta una opción.
La otra explica qué omite o modifica.
Ambas identifican una garantía que esa opción no proporciona.
Después consultan el esquema o documentación de la versión utilizada.

### 43.3. Casos

Analiza credenciales, metadatos, región, cuenta y estilo S3.
No retires endpoints para provocar solicitudes externas.
Utiliza fragmentos ficticios cuando una prueba pueda cambiar el destino.

### 43.4. Entregable

Entrega una tabla con opción, finalidad, límite y comprobación.
No atribuyas a las opciones de omisión una seguridad que no ofrecen.

---

## 44. Sesión práctica C: revisar una ampliación

La tercera sesión decide si un nuevo servicio puede incorporarse.

### 44.1. Duración y objetivo

Duración orientativa: 30 minutos.
Objetivo: revisar una cola SQS antes de ejecutarla.

### 44.2. Actividades

Identifica el recurso.
Comprueba disponibilidad y edición.
Revisa endpoint SQS.
Comprueba recursos del equipo.
Define verificación y limpieza.
Ejecuta solo con autorización.

### 44.3. Decisiones posibles

La ampliación puede aprobarse, posponerse o limitarse a análisis.
No todas las sesiones necesitan crear el recurso.
Una decisión fundamentada también es evidencia de aprendizaje.

### 44.4. Entregable

Documenta operaciones requeridas, condiciones y aspectos pendientes.

---

## 45. Ejercicios de refuerzo

Los ejercicios consolidan lectura y diagnóstico.

### 45.1. Identificación

Explica:

- Qué selecciona `required_providers`.
- Qué configura el bloque `provider`.
- Por qué el endpoint es por servicio.
- Qué significa `s3_use_path_style`.
- Cómo se selecciona un alias.

### 45.2. Casos ficticios

Un recurso utiliza un servicio sin endpoint local.
Una variable contiene un puerto incorrecto.
Terraform funciona en el anfitrión, pero no en otro contenedor.
AWS CLI responde, pero el provider devuelve un error.

### 45.3. Resolución

Para cada caso, propón una comprobación.
No inventes una causa definitiva.
Indica qué información falta antes de actuar.

---

## 46. Limpieza y protección de archivos

La limpieza se realiza mientras LocalStack está disponible.

### 46.1. Destruir y verificar

```bash
terraform plan -destroy
terraform destroy
terraform state list
aws_local s3api list-buckets
```

### 46.2. Retirar el servicio

```bash
docker compose down
```

### 46.3. Archivos locales

Excluye `.env`, `.terraform/`, estados, planes y logs sensibles.
Conserva `.terraform.lock.hcl` y configuración revisada.
Un archivo ignorado puede seguir registrado si ya estaba en Git.
Detener LocalStack no equivale a destruir recursos mediante Terraform.

---

## 47. Diferencias respecto a AWS real y evaluación

La configuración local tiene límites operativos y educativos.

### 47.1. Diferencias esenciales

AWS real requiere identidades, permisos y control de costes.
LocalStack no garantiza equivalencia de seguridad, rendimiento o disponibilidad.
Cambiar el endpoint no convierte una prueba local en una migración validada.
La transición necesita una unidad específica y autorización.

### 47.2. Rúbrica inicial

| **Criterio** | **0 puntos** | **1 punto** | **2 puntos** |
|-------------|--------------|-------------|-------------|
| Conexión | No identificada | Parcialmente clara | Endpoints revisados |
| Opciones | Explicación incorrecta | Explicación parcial | Finalidad y límites claros |
| Verificación | Sin evidencias | Evidencia incompleta | Estado y API comparados |
| Seguridad | Incumple límites | Cumplimiento parcial | Controles y limpieza |
| Documentación | No reproducible | Faltan datos | Versiones y decisiones claras |

La puntuación máxima es diez.
Un fallo crítico no queda compensado por una puntuación alta.

---

## 48. Resumen y siguientes pasos

El provider conecta intención declarativa y operaciones de API.

### 48.1. Ideas esenciales

- Terraform CLI y provider tienen versiones independientes.
- El provider de AWS puede dirigirse a LocalStack.
- Los endpoints deben corresponder a los servicios utilizados.
- Las credenciales ficticias no constituyen aislamiento completo.
- Las opciones `skip_*` tienen finalidades concretas.
- El estilo S3 afecta al direccionamiento.
- Los aliases necesitan configuraciones revisadas.
- Los módulos requieren relaciones de provider comprensibles.

### 48.2. Rutina reutilizable

Identifica recursos y servicios.
Revisa versiones, credenciales y endpoints.
Comprueba LocalStack.
Genera un plan.
Aplica después de revisar.
Verifica y limpia.

### 48.3. Cierre

**Configura el destino, comprende las opciones y comprueba el resultado antes de confiar en la automatización.**