# Endpoints, regiones y credenciales de prueba con Terraform y LocalStack

> Curso de Terraform con LocalStack emulando servicios de AWS.
> Todas las prácticas de esta lección se realizan en un entorno local.
> No necesitas una cuenta de AWS para completar los ejercicios.
> Utiliza exclusivamente credenciales ficticias.
> Una prueba satisfactoria en LocalStack no equivale a validar AWS real.

Un endpoint responde a la pregunta **dónde se envía una solicitud**.
Una región participa en la configuración y el contexto de esa solicitud.
Las credenciales permiten identificar y firmar la petición según el mecanismo utilizado.
Estos tres elementos están relacionados, pero no son intercambiables.

En esta lección aprenderás a configurarlos de manera explícita.
También comprobarás cómo cambian las conexiones cuando cambia el contexto de ejecución.
El laboratorio principal utilizará un bucket S3 local.
Las ampliaciones introducirán otro puerto y una región alternativa de referencia.

Terraform, AWS CLI y Docker mantendrán responsabilidades separadas.
No asumiremos que configurar una herramienta configura automáticamente las demás.
Cada práctica incluirá instrucciones, comprobaciones y un entregable observable.

---

## 1. Objetivos de aprendizaje

La unidad construye una base para interpretar conexiones y evitar destinos inesperados.

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Explicar qué es un endpoint.
- Diferenciar región y dirección de conexión.
- Distinguir credenciales ficticias y credenciales reales.
- Identificar el contexto desde el que se ejecuta un cliente.
- Explicar por qué un perfil no garantiza un destino local.

### 1.2. Objetivos prácticos

También podrás configurar Terraform y AWS CLI para LocalStack.

Podrás comprobar un bucket desde dos herramientas.
Podrás diagnosticar un puerto incorrecto sin introducir claves reales.
Podrás registrar las condiciones de una prueba y verificar su limpieza.

---

## 2. Alcance y condiciones

La práctica utiliza una arquitectura concreta para reducir ambigüedades.

### 2.1. Arquitectura principal

Terraform se ejecuta en el equipo anfitrión.
AWS CLI también se ejecuta en el anfitrión.
LocalStack se ejecuta dentro de Docker.
El puerto del contenedor se publica en la interfaz de bucle local.

### 2.2. Valores iniciales

Utilizaremos:

- Endpoint: `http://localhost:4566`.
- Región: `us-east-1`.
- Access key ficticia: `test`.
- Secret key ficticia: `test`.

### 2.3. Exclusiones

No se utilizarán cuentas reales, perfiles corporativos ni recursos de producción.
Las ampliaciones no deben ejecutarse sin revisar sus condiciones.
Los comandos de terminal utilizan Bash.

---

## 3. Requisitos previos

Comprueba las herramientas antes de crear recursos.

### 3.1. Herramientas necesarias

Prepara:

- Terraform CLI.
- Docker con su motor disponible.
- Docker Compose.
- AWS CLI versión 2.
- `curl`.
- Un editor de texto.

### 3.2. Comprobaciones iniciales

```bash
terraform version
docker version
docker compose version
aws --version
```

### 3.3. Criterio de avance

Docker debe mostrar un servidor disponible.
El docente debe haber probado la combinación de herramientas del curso.

---

## 4. Versiones y reproducibilidad

Las opciones admitidas y los comportamientos pueden variar entre versiones.

### 4.1. Base didáctica

El proyecto utilizará Terraform desde 1.6 y anterior a 2.0.
El provider de AWS se limitará a la serie 5.
LocalStack utilizará una referencia concreta proporcionada por el docente.
Estas elecciones no representan una afirmación sobre versiones actuales.

### 4.2. Registro obligatorio

Anota:

- Terraform CLI.
- Provider seleccionado.
- Docker y Compose.
- AWS CLI.
- Imagen y modalidad de LocalStack.
- Sistema y arquitectura.

### 4.3. Cambios

Una actualización exige repetir las comprobaciones relevantes.
Esta documentación no afirma haber ejecutado la combinación en tu equipo.

---

## 5. Qué es un endpoint

Un endpoint es una dirección utilizada para acceder a una API.

### 5.1. Ejemplo del laboratorio

```text
http://localhost:4566
```

El esquema es `http`.
El nombre del servidor es `localhost`.
El puerto es `4566`.
El cliente construye las solicitudes del servicio a partir de esa dirección.

### 5.2. Endpoint y recurso

El endpoint no es el nombre del bucket.
Tampoco es la dirección de un recurso dentro del estado de Terraform.
Un mismo endpoint de LocalStack puede atender varios servicios compatibles.

### 5.3. Pregunta de control

Antes de ejecutar una operación, identifica qué cliente utilizará esa dirección.
Después comprueba desde dónde se ejecuta ese cliente.

---

## 6. Qué significa una región

La región forma parte del contexto de determinadas operaciones.

### 6.1. En AWS real

Muchos recursos se organizan por regiones.
Algunos servicios tienen comportamientos globales o particularidades propias.
No todos los servicios siguen exactamente el mismo modelo regional.

### 6.2. En LocalStack

El cliente sigue proporcionando una región.
El emulador puede utilizarla para organizar información o responder a operaciones.
Ese comportamiento depende del servicio y la versión.
No equivale a reproducir una ubicación física de AWS.

### 6.3. Región y destino

Escribir `us-east-1` no convierte una solicitud en local.
Escribir otra región tampoco cambia automáticamente el endpoint.
Ambos valores deben revisarse por separado.

### 6.4. Valor del curso

La práctica principal utiliza `us-east-1` para reducir variaciones.

---

## 7. Qué son las credenciales de prueba

Las credenciales ficticias permiten construir solicitudes del laboratorio.

### 7.1. Valores utilizados

```text
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
```

Estos valores no representan una identidad válida de AWS.
No tienen que sustituirse por claves personales.
No proceden de una cuenta que debas crear.

### 7.2. Lo que no garantizan

Las credenciales ficticias no bloquean tráfico externo.
Una solicitud puede intentar contactar con un endpoint no deseado.
La prevención necesita configuración explícita y controles adicionales.

### 7.3. Regla de seguridad

Si aparece un error de firma, investiga el entorno.
No lo resuelvas introduciendo credenciales reales.

---

## 8. Cómo se relacionan los tres componentes

Endpoint, región y credenciales responden preguntas diferentes.

### 8.1. Comparación

La tabla resume sus responsabilidades.

| **Componente** | **Pregunta** | **Valor inicial** |
|----------------|--------------|-------------------|
| Endpoint | ¿Dónde se envía? | `http://localhost:4566` |
| Región | ¿Qué contexto regional se utiliza? | `us-east-1` |
| Credenciales | ¿Con qué datos se firma? | `test` y `test` |
| Servicio | ¿Qué API se solicita? | S3 |

Ninguna fila sustituye a las demás.

### 8.2. Ejemplo de error conceptual

Un alumno utiliza credenciales ficticias, pero no configura el endpoint.
La intención de trabajar localmente no basta.
El cliente puede conservar un destino predeterminado.
El procedimiento debe hacer visible esa decisión.

---

## 9. El significado de `localhost`

`localhost` identifica el entorno de red desde el que se utiliza.

### 9.1. Desde el anfitrión

Terraform alcanza el puerto publicado por Docker.
AWS CLI utiliza el mismo puerto publicado.
Ambos clientes pueden usar `http://localhost:4566` en esta arquitectura.

### 9.2. Desde otro contenedor

`localhost` identifica ese otro contenedor.
No identifica automáticamente al contenedor de LocalStack.
La conexión necesita un nombre de servicio o una ruta de red adecuada.

### 9.3. Desde otra máquina

`localhost` identifica la otra máquina.
No apunta al equipo del docente.
Compartir una cadena de conexión no comparte un servicio.

### 9.4. Idea esencial

**La dirección debe interpretarse junto con el contexto de ejecución.**

---

## 10. Puertos internos y publicados

Docker distingue el puerto del contenedor y el puerto del anfitrión.

### 10.1. Mapeo principal

```yaml
ports:
  - "127.0.0.1:4566:4566"
```

La dirección del anfitrión es `127.0.0.1`.
El puerto del anfitrión es `4566`.
El puerto del contenedor es `4566`.

### 10.2. Mapeo alternativo

```yaml
ports:
  - "127.0.0.1:4567:4566"
```

En este caso, los clientes anfitriones utilizarán el puerto `4567`.

### 10.3. Consecuencia

Cambiar el puerto publicado exige actualizar los endpoints de los clientes.

---

## 11. Endpoints por servicio en Terraform

El provider de AWS permite configurar destinos para servicios concretos.

### 11.1. Ejemplo conceptual

```hcl
endpoints {
  s3  = "http://localhost:4566"
  sts = "http://localhost:4566"
}
```

### 11.2. Alcance

El bloque contempla S3 y STS.
No debes asumir que redirige todas las APIs del provider.
Añadir un recurso SQS exige revisar su endpoint.
Añadir otro servicio exige revisar también sus operaciones auxiliares.

### 11.3. Prevención

Revisa todos los recursos antes de ejecutar `plan`.
La planificación puede realizar consultas.
No utilices un plan como detector seguro de destinos desconocidos.

### 11.4. Regla

La lista de servicios y la configuración de endpoints deben mantenerse coherentes.

---

## 12. Firma de solicitudes

La firma conecta credenciales y contexto de la petición.

### 12.1. Explicación operativa

El cliente construye una solicitud.
Utiliza credenciales para calcular información de autenticación.
La región y el servicio pueden formar parte del contexto de firma.
El receptor interpreta la petición según su implementación.

### 12.2. En el laboratorio

Utilizamos credenciales ficticias y una región explícita.
La aceptación local no certifica una identidad de AWS.
Tampoco demuestra reproducción completa de todas las comprobaciones de seguridad.

### 12.3. Errores posibles

Un error puede relacionarse con credenciales, token temporal, región o reloj.
También puede depender de la versión y configuración del emulador.
No atribuyas una causa definitiva sin comprobarla.

### 12.4. Límite

Esta unidad no desarrolla todos los detalles criptográficos de la firma.

---

## 13. Tokens temporales heredados

Una terminal puede conservar datos de identidad de otro proyecto.

### 13.1. Riesgo habitual

Además de access key y secret key, algunos mecanismos utilizan un token temporal.
Un token heredado puede producir comportamientos inesperados.
No debe incorporarse a la práctica sin intención.

### 13.2. Medida del laboratorio

Las funciones de AWS CLI vaciarán `AWS_SESSION_TOKEN` por invocación.
Para Terraform, utilizaremos una terminal dedicada.
Si existe un token heredado, retíralo únicamente de esa sesión.

### 13.3. Comando de sesión

```bash
unset AWS_SESSION_TOKEN
```

### 13.4. Precaución

No borres archivos personales de credenciales.
No imprimas tokens para demostrar que existen.

---

## 14. Perfiles y archivos de configuración

Un perfil agrupa opciones, pero no garantiza un destino local.

### 14.1. Qué puede contener

Un perfil puede incluir:

- Región.
- Formato de salida.
- Datos de identidad.
- Ajustes compatibles con el cliente.
- Referencias a otros mecanismos de autenticación.

### 14.2. Qué no significa

Un perfil llamado `localstack` no es una cuenta local por definición.
El nombre no cambia automáticamente el destino.
La configuración efectiva debe revisarse.

### 14.3. Decisión de la práctica

No modificaremos los archivos personales del alumno.
La función local utilizará credenciales ficticias explícitas.
Terraform tendrá su propia configuración de conexión.

### 14.4. Resultado

Cada herramienta tendrá decisiones visibles y separadas.

---

## 15. Variables de entorno y precedencia

Las herramientas pueden recibir valores desde varias fuentes.

### 15.1. Fuentes habituales

Pueden intervenir:

- Opciones de línea de comandos.
- Variables de entorno.
- Archivos de configuración.
- Valores predeterminados.
- Mecanismos de identidad del entorno.

### 15.2. Matiz importante

La precedencia depende del parámetro y de la herramienta.
No existe una regla simplificada que resuelva todos los casos.
AWS CLI y el provider no deben tratarse como una única implementación.

### 15.3. Procedimiento

Utiliza una terminal exclusiva para el curso.
Evita valores contradictorios.
Registra los valores explícitos del laboratorio.
No compartas salidas que revelen secretos.

---

## 16. Preparar el proyecto

Utiliza un directorio exclusivo y conserva sus decisiones.

### 16.1. Crear la carpeta

```bash
mkdir -p ~/cursos/terraform/endpoints-localstack/evidencias
cd ~/cursos/terraform/endpoints-localstack
```

### 16.2. Archivos previstos

```text
endpoints-localstack/
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

## 17. Seleccionar la imagen de LocalStack

El docente debe proporcionar una referencia concreta y probada.

### 17.1. Archivo `.env.example`

```dotenv
COMPOSE_PROJECT_NAME=aula-endpoints
LOCALSTACK_IMAGE=localstack/localstack:ETIQUETA_PROBADA
LOCALSTACK_PORT=4566
```

### 17.2. Crear configuración local

```bash
cp .env.example .env
```

Sustituye `ETIQUETA_PROBADA` antes de continuar.
No cambies automáticamente a `latest`.
Comprueba edición, disponibilidad de S3 y requisitos de autenticación.

### 17.3. Secretos

Un posible token de LocalStack no es la secret key ficticia de AWS.
Si se necesita, utiliza el mecanismo autorizado por el centro.
No lo publiques en el ejemplo.

---

## 18. Archivo de Docker Compose

Compose publicará el endpoint local.

### 18.1. Archivo `compose.yaml`

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

### 18.2. Decisiones

No se configura persistencia explícita.
No se monta el socket de Docker.
No se publican servicios en todas las interfaces.
No se añaden credenciales reales.

### 18.3. Alcance

Declarar servicios no acredita compatibilidad completa ni derechos de acceso a una modalidad.

---

## 19. Arranque y comprobaciones iniciales

Separa validación, descarga y disponibilidad.

### 19.1. Comandos

```bash
docker compose config --quiet
docker compose pull
docker compose up -d
docker compose ps
docker compose port localstack 4566
```

### 19.2. Registros

```bash
docker compose logs --tail=100 localstack
```

### 19.3. Interpretación

Un contenedor iniciado puede seguir inicializando servicios.
El puerto publicado debe coincidir con el endpoint.
Los registros ayudan a identificar errores, pero no sustituyen una consulta funcional.
No continúes ante una imagen o un puerto inesperados.

---

## 20. Definir el endpoint de AWS CLI

La terminal mantendrá una referencia explícita al destino.

### 20.1. Variable del ejercicio

```bash
export LOCALSTACK_ENDPOINT="http://localhost:4566"
```

### 20.2. Qué representa

Esta variable pertenece al procedimiento de la clase.
AWS CLI no la interpreta automáticamente por tener ese nombre.
La función posterior la utilizará con `--endpoint-url`.

### 20.3. Consulta de salud

```bash
curl --fail --silent --show-error \
  "${LOCALSTACK_ENDPOINT}/_localstack/health"
```

### 20.4. Límite

La estructura depende de la versión.
La consulta de salud no verifica todas las operaciones S3.

---

## 21. Función local para AWS CLI

La función concentra credenciales ficticias, región y destino.

### 21.1. Definición en Bash

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

### 21.2. Alcance

Debe definirse otra vez en una terminal nueva.
No constituye un aislamiento universal de red.

---

## 22. Primera consulta funcional

Comprueba el servicio antes de preparar la aplicación de Terraform.

### 22.1. Consulta

```bash
aws_local s3api list-buckets
resultado=$?
printf 'Codigo de salida: %s\n' "$resultado"
```

### 22.2. Resultado esperado

La solicitud debe terminar correctamente.
Una lista vacía es válida en una instancia limpia.
Si aparecen recursos, determina si pertenecen a otro ejercicio o equipo.
No los elimines automáticamente.

### 22.3. Evidencia

Registra operación, endpoint, región y resultado.
El código debe guardarse inmediatamente después del comando.

### 22.4. Alcance

La prueba verifica `ListBuckets`, no todo S3.

---

## 23. Restricciones de Terraform

La dependencia del provider debe quedar explícita.

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

La versión de Terraform es independiente de la del provider.
La restricción permite selecciones dentro de la serie 5.
El archivo de bloqueo conservará la selección efectiva.

### 23.3. Política

No utilices `init -upgrade` durante una comparación sin registrarlo.

---

## 24. Variables del laboratorio

Las entradas harán visible el endpoint y la región utilizados.

### 24.1. Archivo `variables.tf`

```hcl
variable "localstack_endpoint" {
  description = "Endpoint del laboratorio local."
  type        = string
  default     = "http://localhost:4566"
}

variable "aws_region" {
  description = "Region de referencia."
  type        = string
  default     = "us-east-1"
}

variable "bucket_name" {
  description = "Nombre del bucket de prueba."
  type        = string
  default     = "aula-endpoints-localstack-001"
}
```

---

## 25. Validación educativa del endpoint

Una lista explícita reduce errores de entrada en la práctica.

### 25.1. Bloque opcional

Añádelo dentro de `localstack_endpoint`:

```hcl
validation {
  condition = contains(
    [
      "http://localhost:4566",
      "http://127.0.0.1:4566",
      "http://localhost:4567",
      "http://127.0.0.1:4567"
    ],
    var.localstack_endpoint
  )
  error_message = "Utiliza un endpoint local autorizado del laboratorio."
}
```

### 25.2. Límite

La validación no comprueba proxy, proceso receptor ni red.
No sustituye controles externos.

---

## 26. Provider de AWS para LocalStack

Terraform utilizará su propia configuración de conexión.

### 26.1. Archivo `providers.tf`

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

### 26.2. Revisión

Solo se contemplan S3 y STS.
Las opciones de omisión no bloquean tráfico externo.

---

## 27. Interpretar las opciones del provider

Cada opción modifica una comprobación o un comportamiento concreto.

### 27.1. Resumen

La tabla orienta su lectura.

| **Opción** | **Finalidad en el laboratorio** | **Lo que no garantiza** |
|------------|---------------------------------|-------------------------|
| `skip_credentials_validation` | Omitir validación inicial de credenciales | Aislamiento de red |
| `skip_metadata_api_check` | Evitar comprobaciones de metadatos | Ausencia de todas las consultas |
| `skip_region_validation` | Omitir validación inicial de región | Compatibilidad de cualquier región |
| `skip_requesting_account_id` | Omitir obtención inicial de cuenta | Funcionamiento de todos los recursos |

El comportamiento debe revisarse en la versión seleccionada.

### 27.2. Estilo S3

`s3_use_path_style` facilita el direccionamiento por ruta.
No convierte S3 en otro servicio.
No configura automáticamente AWS CLI.
Cada herramienta conserva sus propios ajustes.

---

## 28. Recurso y salidas

El bucket permanecerá vacío para simplificar la limpieza.

### 28.1. Archivo `main.tf`

```hcl
resource "aws_s3_bucket" "laboratorio" {
  bucket        = var.bucket_name
  force_destroy = false

  tags = {
    Curso   = "Terraform"
    Entorno = "LocalStack"
  }
}
```

### 28.2. Archivo `outputs.tf`

```hcl
output "bucket_name" {
  value = aws_s3_bucket.laboratorio.bucket
}
```

---

## 29. Inicialización y revisión

Las comprobaciones previas deben realizarse desde la carpeta correcta.

### 29.1. Comandos

```bash
terraform init
terraform fmt
terraform validate
terraform plan
```

### 29.2. Qué observar

Comprueba la versión seleccionada del provider.
Localiza `aws_s3_bucket.laboratorio`.
Identifica el nombre previsto.
Comprueba que no aparecen recursos ajenos.
Marca los valores conocidos después de aplicar.

### 29.3. Límites

`validate` no demuestra conectividad.
`init` no crea el bucket.
El plan puede realizar consultas y debe tener un destino previamente revisado.

---

## 30. Aplicación y verificación cruzada

La creación necesita una comprobación independiente.

### 30.1. Aplicar

```bash
terraform apply
```

Lee la propuesta antes de confirmar.
No utilices `-auto-approve` en esta sesión.

### 30.2. Consultar

```bash
terraform output
terraform state list

aws_local s3api head-bucket \
  --bucket aula-endpoints-localstack-001
```

### 30.3. Interpretación

La salida depende del estado.
AWS CLI consulta la API.
Adapta el nombre si cambiaste la entrada.

---

## 31. Cambiar el puerto de manera controlada

La ampliación utiliza el puerto anfitrión `4567`.

### 31.1. Condición previa

Limpia el bucket antes de recrear un entorno sin persistencia.
Verifica la destrucción mientras LocalStack sigue disponible.
No presupongas conservación de datos.

### 31.2. Cambio

Edita `.env`:

```dotenv
LOCALSTACK_PORT=4567
```

Después aplica Compose:

```bash
docker compose up -d
docker compose port localstack 4566
```

### 31.3. Advertencia

`docker compose restart` no sustituye la aplicación de cambios de publicación.

---

## 32. Sincronizar los clientes con el nuevo puerto

Compose, AWS CLI y Terraform necesitan valores coherentes.

### 32.1. Actualizar la terminal

```bash
export LOCALSTACK_ENDPOINT="http://localhost:4567"
export TF_VAR_localstack_endpoint="$LOCALSTACK_ENDPOINT"
```

### 32.2. Comprobar

```bash
aws_local s3api list-buckets
terraform plan
```

### 32.3. Distinción

`.env` se utiliza para sustitución de Compose en este procedimiento.
Terraform no carga automáticamente ese archivo.
`TF_VAR_localstack_endpoint` proporciona una entrada al módulo raíz.

### 32.4. Evidencia

Registra puerto publicado, endpoint del cliente y entrada efectiva.
Una cadena igual en varios archivos no demuestra por sí sola coherencia operativa.

---

## 33. Región alternativa: particularidades de S3

La ampliación regional necesita considerar la API utilizada.

### 33.1. Creación mediante AWS CLI

Para una región alternativa, el procedimiento de S3 puede necesitar una configuración adicional:

```bash
aws_local s3api create-bucket \
  --bucket aula-region-alternativa-001 \
  --create-bucket-configuration LocationConstraint=eu-west-1 \
  --region eu-west-1
```

### 33.2. Matiz

La función fija inicialmente `us-east-1`.
La opción explícita posterior selecciona la región de esta invocación.
El docente debe probar la solicitud con la versión del cliente y del emulador.

### 33.3. Límite

No generalices las particularidades de S3 a todos los servicios.
No cambies la región para corregir un puerto incorrecto.
La ampliación debe incluir su propia limpieza.

---

## 34. Verificar la región sin sobregeneralizar

La respuesta de una operación debe interpretarse dentro de su contexto.

### 34.1. Consulta

```bash
aws_local s3api get-bucket-location \
  --bucket aula-region-alternativa-001 \
  --region eu-west-1
```

### 34.2. Qué revisar

Compara la ubicación informada con la solicitud.
Registra la respuesta real.
Algunas representaciones de ubicación tienen particularidades en AWS.
No presupongas una cadena idéntica para todas las regiones.

### 34.3. Limpieza

```bash
aws_local s3api delete-bucket \
  --bucket aula-region-alternativa-001 \
  --region eu-west-1
```

### 34.4. Alcance

La prueba no demuestra aislamiento físico ni todas las reglas regionales de AWS.

---

## 35. Credenciales ficticias y cuentas emuladas

Los valores de prueba pueden influir en el contexto del emulador.

### 35.1. No asumir equivalencia

No presupongas que cualquier access key ficticia representa siempre la misma cuenta local.
La interpretación depende del comportamiento documentado de la versión.
Cambiar credenciales puede alterar lo que observa una consulta.

### 35.2. Regla del laboratorio

Mantén `test` de forma coherente entre clientes.
No experimentes con formatos que parezcan credenciales reales.
No fijes un identificador de cuenta universal basándote en un ejemplo.

### 35.3. Identidad local

Una consulta STS puede ser útil si está soportada y autorizada.
Su respuesta describe el contexto emulado.
No certifica una identidad válida de AWS.

### 35.4. Documentación

Registra valores ficticios, versión y alcance sin presentar una cuenta local como real.

---

## 36. Aliases y varios contextos

Un alias permite otra configuración del mismo provider.

### 36.1. Usos posibles

Puede representar:

- Otra región de referencia.
- Otro endpoint local.
- Otra instancia de LocalStack.
- Una conexión seleccionada para un módulo.

### 36.2. Límites

El alias no es otro plugin.
No crea automáticamente otro estado.
No constituye una barrera universal de seguridad.
Debe configurarse explícitamente.

### 36.3. Ejemplo de selección

```hcl
provider = aws.local_alternativo
```

Esta referencia necesita un bloque de provider con ese alias.

---

## 37. Diagnóstico por capas

Una conexión fallida puede tener causas diferentes.

### 37.1. Tabla orientativa

La tabla ayuda a seleccionar la siguiente comprobación.

| **Síntoma** | **Capa posible** | **Comprobación inicial** |
|-------------|------------------|--------------------------|
| Conexión rechazada | Red o proceso | Contenedor y puerto |
| Nombre no resuelto | DNS o contexto | Host y lugar de ejecución |
| Firma rechazada | Credenciales o contexto | Valores ficticios y token |
| Región inesperada | Configuración | Entrada y opciones del cliente |
| Recurso no visible | Estado o contexto | Nombre, cliente y entorno |

Las filas son hipótesis, no diagnósticos confirmados.

### 37.2. Procedimiento

Copia el mensaje saneado.
Identifica el comando.
Comprueba el contexto.
Cambia una condición relevante.
Repite y documenta.

---

## 38. Pruebas negativas seguras

Una prueba negativa debe evitar destinos externos no autorizados.

### 38.1. Ejemplo permitido

Utiliza un puerto de bucle local previamente comprobado como no ocupado.
No utilices una dirección de AWS para provocar un error.
No elimines endpoints de servicios antes de ejecutar un plan.

### 38.2. Preguntas

¿Qué error aparece?
¿Cuánto tarda?
¿Qué componente recibe o rechaza la conexión?
¿Qué información falta?
¿Qué consulta confirmarías después?

### 38.3. Recuperación

Restablece el endpoint correcto.
Consulta S3.
Genera otro plan.
No introduzcas claves reales ni amplíes permisos.

### 38.4. Evidencia

Distingue el fallo provocado y la recuperación verificada.

---

## 39. Sesiones prácticas para el alumnado

Las sesiones convierten la configuración en comportamientos observables.

### 39.1. Sesión A: conexión inicial

Duración orientativa: 40 minutos.
Crea el proyecto, arranca LocalStack y configura ambos clientes.
Aplica Terraform y consulta el bucket.
Entrega endpoint, región, versión efectiva y dos evidencias.

### 39.2. Sesión B: cambio de puerto

Duración orientativa: 30 minutos.
Limpia el recurso, cambia el puerto y sincroniza clientes.
Explica por qué `.env` no basta para configurar Terraform.
Entrega una comparación de valores antes y después.

### 39.3. Sesión C: diagnóstico por parejas

Duración orientativa: 25 minutos.
Una persona presenta un caso ficticio de conexión fallida.
La otra solicita evidencias antes de proponer cambios.
Intercambiad funciones y registrad una hipótesis descartada.

### 39.4. Condición

Las herramientas deben estar instaladas antes de comenzar el tiempo de las sesiones.

---

## 40. Limpieza, evaluación y cierre

La unidad termina con recursos eliminados y conclusiones respaldadas por evidencias.

### 40.1. Limpieza principal

Con el endpoint efectivo y LocalStack disponible:

```bash
terraform plan -destroy
terraform destroy
terraform state list
aws_local s3api list-buckets
docker compose down
```

### 40.2. Protección

No publiques estados, planes, tokens ni logs sensibles.
Conserva configuración, archivo de bloqueo y evidencias saneadas.
Elimina variables de sesión solo cuando ya no se necesiten.

### 40.3. Evaluación

Comprueba que puedes explicar destino, región, credenciales y contexto.
Una puntuación alta no compensa una operación no autorizada.
Documenta qué verificaste y qué sigue pendiente.

### 40.4. Idea final

**Configura cada componente explícitamente, comprueba el destino y limita tus conclusiones a la evidencia observada.**