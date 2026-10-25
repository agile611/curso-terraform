# Terraform, AWS y LocalStack: configuración, ejecución y verificación de laboratorios locales

> Curso de Terraform para AWS.
> Los ejemplos y prácticas de esta lección se ejecutan localmente con LocalStack.
> No utilices cuentas ni credenciales reales de AWS para completar estos ejercicios.
> Una ejecución satisfactoria en el emulador no equivale a una validación completa en AWS.

Terraform permite describir infraestructura mediante archivos de configuración.
AWS proporciona las APIs y los servicios que utilizaremos como referencia.
LocalStack ofrece un entorno de emulación para practicar determinados comportamientos de esas APIs.
En esta lección aprenderás a conectar los tres componentes sin confundir sus responsabilidades.

El laboratorio principal crea un bucket S3 y consulta sus propiedades.
Después introduce cambios controlados, comprobaciones independientes y una limpieza revisada.
Las sesiones propuestas combinan trabajo individual, revisión por parejas y documentación de resultados.

La prioridad no es ejecutar muchos comandos.
La prioridad es comprender qué se solicita, dónde se ejecuta y cómo se comprueba.
Cada operación debe tener una intención clara y una evidencia observable.

---

## 1. Objetivos de aprendizaje

Esta lección construye una base operativa para los siguientes laboratorios del curso.

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Diferenciar Terraform, el provider de AWS y LocalStack.
- Explicar cómo se selecciona un endpoint.
- Distinguir una región de referencia de una región real de ejecución.
- Diferenciar configuración, estado y recursos observados.
- Reconocer los límites de un laboratorio emulado.

### 1.2. Objetivos prácticos

También podrás:

- Preparar un proyecto reproducible.
- Arrancar LocalStack mediante Docker Compose.
- Configurar Terraform con credenciales ficticias.
- Crear un bucket S3 local.
- Consultar el recurso mediante una segunda herramienta.
- Aplicar cambios después de revisar un plan.
- Limpiar el laboratorio sin borrar evidencias necesarias.

### 1.3. Resultado esperado

Entregarás una configuración funcional y un registro de práctica.
El registro distinguirá acciones propuestas, ejecutadas y verificadas.
También incluirá las versiones utilizadas y las limitaciones pendientes.

---

## 2. Alcance y condiciones del laboratorio

El ejercicio está deliberadamente limitado para facilitar su comprensión.

### 2.1. Servicios utilizados

Trabajaremos únicamente con:

- S3 como servicio principal.
- STS como endpoint auxiliar configurado.
- Terraform CLI.
- El provider `hashicorp/aws`.
- LocalStack dentro de Docker.
- AWS CLI para comprobaciones independientes.

### 2.2. Arquitectura asumida

Terraform y AWS CLI se ejecutan en el equipo anfitrión.
LocalStack se ejecuta en un contenedor.
Su puerto se publica en la interfaz de bucle local.
La dirección utilizada será `http://localhost:4566`.

### 2.3. Exclusiones

No se incluyen recursos EC2, redes VPC ni bases de datos.
No se configura un backend remoto.
No se utiliza un workspace para separar entornos.
No se reproducen políticas corporativas de seguridad.
No se ejecutan operaciones sobre AWS real.

### 2.4. Regla de ampliación

Añadir un servicio exige revisar su endpoint y su compatibilidad.
No copies recursos de otra lección suponiendo que todas las llamadas serán locales.

---

## 3. Requisitos previos

Comprueba las herramientas antes de empezar a escribir infraestructura.

### 3.1. Conocimientos necesarios

Debes saber:

- Crear y editar archivos.
- Abrir una terminal.
- Cambiar de directorio.
- Interpretar mensajes de error básicos.
- Diferenciar un archivo de un proceso.
- Identificar un puerto y una dirección local.

### 3.2. Herramientas necesarias

Instala o utiliza un entorno autorizado con:

- Terraform CLI compatible con las restricciones del proyecto.
- Docker Engine o Docker Desktop.
- Docker Compose con el comando `docker compose`.
- AWS CLI.
- `curl`.
- Un editor de texto.

### 3.3. Entorno de comandos

Los ejemplos de terminal utilizan Bash.
En Windows puedes emplear WSL o un entorno equivalente autorizado.
No pegues funciones Bash directamente en PowerShell.
Las rutas y las reglas de permisos pueden variar entre sistemas.

### 3.4. Recomendación docente

El docente debe probar la combinación de herramientas antes de la sesión.
El alumnado debe registrar la combinación que realmente utiliza.

### 3.5. Instalación de Terraform en Ubuntu 24.04

Terraform no está en los repositorios oficiales de Ubuntu. El método recomendado es utilizar el repositorio oficial de HashiCorp.

```bash
# 1. Actualizar el índice de paquetes e instalar dependencias
sudo apt-get update && sudo apt-get install -y gnupg software-properties-common curl

# 2. Añadir la clave GPG oficial de HashiCorp
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg

# 3. Añadir el repositorio oficial de HashiCorp
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
https://apt.releases.hashicorp.com $(lsb_release -cs) main" | \
sudo tee /etc/apt/sources.list.d/hashicorp.list

# 4. Actualizar e instalar Terraform
sudo apt-get update && sudo apt-get install -y terraform
```

#### Verificación de la instalación

```bash
terraform version
```

Debería mostrar algo similar a:

```text
Terraform v1.9.x
on linux_amd64
```

#### Instalación de una versión específica (opcional)

Si el curso requiere una versión concreta (por ejemplo, `1.8.5`):

```bash
# Ver versiones disponibles
apt-cache madison terraform

# Instalar versión específica
sudo apt-get install -y terraform=1.8.5
```

#### Actualización posterior

```bash
sudo apt-get update && sudo apt-get install -y --only-upgrade terraform
```

#### Desinstalación

```bash
sudo apt-get remove --purge -y terraform
sudo rm /etc/apt/sources.list.d/hashicorp.list
sudo rm /usr/share/keyrings/hashicorp-archive-keyring.gpg
sudo apt-get update
```

> **Nota:** El repositorio de HashiCorp usa el nombre en clave de Ubuntu (`noble` para 24.04). El comando `$(lsb_release -cs)` lo detecta automáticamente.

### 3.6. Instalación de AWS CLI v2 en Ubuntu 24.04

AWS CLI v2 no está en los repositorios oficiales de Ubuntu. El método recomendado es el instalador oficial de AWS.

```bash
# 1. Descargar el instalador
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"

# 2. Instalar unzip si no está presente
sudo apt-get update && sudo apt-get install -y unzip

# 3. Descomprimir e instalar
unzip awscliv2.zip
sudo ./aws/install

# 4. Limpiar archivos temporales
rm -rf awscliv2.zip aws
```

#### Verificación de la instalación

```bash
aws --version
```

Debería mostrar algo similar a:

```text
aws-cli/2.x.x Python/3.x.x Linux/6.x.x exe/x86_64.ubuntu.24
```

#### Instalación de una versión específica (opcional)

```bash
# Ver versiones disponibles en el changelog de AWS
# https://github.com/aws/aws-cli/blob/v2/CHANGELOG.rst

# Descargar versión concreta (ejemplo 2.15.0)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64-2.15.0.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install --update
```

#### Actualización posterior

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip -o awscliv2.zip
sudo ./aws/install --update
rm -rf awscliv2.zip aws
```

#### Desinstalación

```bash
sudo rm -rf /usr/local/aws-cli /usr/local/bin/aws /usr/local/bin/aws_completer
```

#### Configuración mínima para el laboratorio

Aunque usaremos credenciales ficticias mediante variables de entorno, AWS CLI requiere una configuración básica para funcionar sin advertencias:

```bash
aws configure set cli_pager ""
aws configure set region us-east-1
```

> **Nota:** Para el laboratorio local con LocalStack, las credenciales reales **no** se configuran aquí. Se pasan mediante la función `aws_local` definida en la sección 3.8, que anula cualquier configuración guardada.

### 3.7. Arranque y verificación de LocalStack

LocalStack se ejecuta en Docker mediante Docker Compose. El archivo `compose.yaml` se crea en la sección 9, pero el arranque pertenece a la preparación del entorno.

#### 3.7.1. Archivo `compose.yaml` (resumen)

```yaml
services:
  localstack:
    image: localstack/localstack:4.0.0
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: s3,sts
      AWS_DEFAULT_REGION: us-east-1
```

> **Nota:** La etiqueta `4.0.0` es una referencia didáctica. Sustitúyela por la versión probada por el curso.

#### 3.7.2. Comandos de arranque

```bash
# 1. Validar sintaxis del compose
docker compose config

# 2. Arrancar en segundo plano
docker compose up -d

# 3. Verificar estado del contenedor
docker compose ps
```

Salida esperada:

```text
NAME                IMAGE                         STATUS          PORTS
localstack          localstack/localstack:4.0.0   Up X seconds    127.0.0.1:4566->4566/tcp
```

#### 3.7.3. Verificar disponibilidad de la API

El contenedor "Up" no garantiza que la API S3 esté lista. Comprueba el endpoint de salud:

```bash
# Endpoint de salud general
curl --fail --silent --show-error \
  http://localhost:4566/_localstack/health
```

Respuesta típica (JSON):

```json
{
  "services": {
    "s3": "running",
    "sts": "running"
  }
}
```

#### 3.7.4. Consultar registros si hay problemas

```bash
# Últimas 100 líneas
docker compose logs --tail=100 localstack

# Seguir logs en tiempo real
docker compose logs -f localstack
```

#### 3.7.5. Detener LocalStack

Al finalizar la práctica (después de limpiar recursos con Terraform):

```bash
docker compose down
```

> **Regla:** Destruye y verifica los recursos Terraform **antes** de detener LocalStack. Detener el contenedor no elimina el estado de Terraform.

### 3.8. Definición y uso de la función `aws_local`

Una vez que LocalStack está en marcha, define la función `aws_local` para dirigir las peticiones de AWS CLI al endpoint local.

La función `aws_local` permite invocar AWS CLI dirigiendo las peticiones a LocalStack sin modificar la configuración global. Defínela al inicio de cada sesión de terminal:

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
    "$@"
}
```

#### Qué hace cada opción

| Opción | Propósito |
|--------|-----------|
| `AWS_ACCESS_KEY_ID=test` / `AWS_SECRET_ACCESS_KEY=test` | Credenciales ficticias requeridas por el CLI |
| `AWS_SESSION_TOKEN=` | Anula tokens de sesión heredados |
| `AWS_CONFIG_FILE=/dev/null` / `AWS_SHARED_CREDENTIALS_FILE=/dev/null` | Ignora archivos de configuración y credenciales locales (incluye perfiles) |
| `AWS_EC2_METADATA_DISABLED=true` | Evita consultas al metadata service de EC2 |
| `--endpoint-url http://localhost:4566` | Redirige la API a LocalStack |
| `--region us-east-1` | Región de referencia (coincide con `compose.yaml`) |
| `--no-cli-pager` | Salida directa sin paginador interactivo |

> **Nota:** No se establece `AWS_PROFILE` porque `AWS_CONFIG_FILE=/dev/null` ya ignora cualquier perfil configurado. Establecer `AWS_PROFILE=` (vacío) causa error en AWS CLI v2: "The config profile () could not be found".

#### Uso básico

```bash
# Listar buckets (debe estar vacío al inicio)
aws_local s3api list-buckets

# Crear un bucket de prueba
aws_local s3api create-bucket --bucket mi-bucket-prueba

# Ver objetos
aws_local s3api list-objects-v2 --bucket mi-bucket-prueba

# Eliminar bucket de prueba
aws_local s3api delete-bucket --bucket mi-bucket-prueba
```

#### Comprobación funcional de S3

La prueba definitiva es una llamada real a S3 mediante `aws_local`:

```bash
# Debe devolver {"Buckets": [], "Owner": {...}} en entorno limpio
aws_local s3api list-buckets
```

Si esta llamada funciona, el laboratorio está listo para Terraform.

#### Persistencia de la función

- La función existe solo en la sesión de Bash actual.
- Al cerrar la terminal, se pierde y debe redefinirse.
- Para evitar redefinirla, añádela a `~/.bashrc` o a un script de arranque del proyecto:

```bash
# En el directorio del proyecto, crea un archivo sourceable
cat > .env.localstack <<'EOF'
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
    "$@"
}
export -f aws_local
EOF

# Cárgalo en cada terminal nueva
source .env.localstack
```

> **Importante:** No guardes credenciales reales en `.env.localstack`. Este archivo es solo para el laboratorio local.

---

## 4. Versiones, compatibilidad y reproducibilidad

Las versiones forman parte de la documentación técnica del laboratorio.

### 4.1. Base de configuración

Los ejemplos declaran:

- Terraform CLI desde la versión 1.6 y anterior a la 2.0.
- Provider de AWS dentro de la serie 5.
- Una etiqueta concreta de LocalStack como referencia didáctica.

Estas elecciones no representan una afirmación sobre las versiones más recientes.
Tampoco constituyen una matriz de compatibilidad validada en esta documentación.

### 4.2. Verificación de herramientas

```bash
terraform version
docker version
docker compose version
aws --version
curl --version
```

### 4.3. Qué debes registrar

Anota las versiones mostradas por los comandos.
Después de inicializar, registra la versión seleccionada del provider.
Anota también la imagen de LocalStack utilizada.
Si el docente facilita otra combinación probada, utiliza esa combinación.

### 4.4. Actualizaciones

No actualices herramientas a mitad de una comparación.
Un cambio de versión puede modificar errores, planes y comportamientos.
Si actualizas, repite las comprobaciones y registra el motivo.

---

## 5. Responsabilidades de cada componente

Comprender la separación evita diagnósticos equivocados.

### 5.1. Terraform CLI

Terraform interpreta archivos HCL.
Construye relaciones entre recursos.
Consulta información mediante providers.
Genera planes y ejecuta operaciones aprobadas.
Conserva información de seguimiento en el estado.

### 5.2. Provider de AWS

El provider traduce declaraciones de Terraform en llamadas a APIs.
Define recursos como `aws_s3_bucket`.
También incorpora esquemas, validaciones y lógica de actualización.
Su versión es independiente de la versión de Terraform CLI.

### 5.3. AWS

AWS define los servicios utilizados como referencia.
En un entorno real intervienen cuentas, permisos, cuotas y costes.
El comportamiento del servicio depende también de región y configuración.
Nada de ello debe darse por reproducido completamente en LocalStack.

### 5.4. LocalStack

LocalStack recibe solicitudes compatibles con determinadas APIs de AWS.
Emula comportamientos dentro del alcance de su versión y edición.
No es una cuenta de AWS.
No convierte una prueba local en una prueba de producción.

---

## 6. Recorrido de una solicitud

La configuración de conexión determina dónde llegan las operaciones.

### 6.1. Flujo del laboratorio

```text
main.tf
   │
   ▼
Terraform CLI
   │
   ▼
Provider hashicorp/aws
   │
   ▼
http://localhost:4566
   │
   ▼
LocalStack: API de S3
```

### 6.2. Qué significa el endpoint

Un endpoint es la dirección de una API.
Configurar un endpoint local cambia el destino de las solicitudes correspondientes.
La sintaxis del recurso puede seguir siendo la del provider de AWS.
Eso no significa que se esté utilizando AWS real.

### 6.3. Riesgo principal

El endpoint se configura por servicio.
Los servicios no configurados pueden conservar destinos predeterminados del provider.
Por eso esta lección limita expresamente los tipos de recursos utilizados.

### 6.4. Comprobación observable

Antes de ejecutar, identifica el recurso y el servicio al que pertenece.
Después comprueba que ese servicio tiene un endpoint local explícito.

---

## 7. Seguridad y aislamiento del ejercicio

Las medidas del laboratorio reducen riesgos, pero no sustituyen controles externos.

### 7.1. Credenciales ficticias

Utilizaremos:

```text
Access key: test
Secret key: test
Región de referencia: us-east-1
```

Estos valores no representan una identidad válida de AWS.
No los sustituyas por credenciales personales.
No copies archivos de credenciales corporativos al proyecto.

### 7.2. Información prohibida

No introduzcas:

- Secretos reales.
- Datos personales de estudiantes.
- Documentos de clientes.
- Archivos de estado de producción.
- Planes procedentes de proyectos no autorizados.

### 7.3. Límite de las opciones del provider

Las opciones para omitir comprobaciones no son un cortafuegos.
Las credenciales ficticias tampoco bloquean por sí solas todo tráfico externo.
El aislamiento fuerte requiere controles de red y permisos del entorno.

### 7.4. Criterio de detención

Detén la práctica ante destinos inesperados o solicitudes de credenciales reales.
Investiga antes de ejecutar nuevos comandos.

---

## 8. Preparación del directorio de trabajo

Un proyecto limpio facilita interpretar los resultados.

### 8.1. Crear el directorio

```bash
mkdir -p terraform-aws-localstack/evidencias
cd terraform-aws-localstack
```

### 8.2. Estructura prevista

```text
terraform-aws-localstack/
├── compose.yaml
├── versions.tf
├── providers.tf
├── variables.tf
├── main.tf
├── outputs.tf
├── .gitignore
├── .terraform.lock.hcl
└── evidencias/
    └── registro.md
```

### 8.3. Regla de organización

Mantén esta práctica separada de otros proyectos.
Terraform interpreta conjuntamente los archivos `.tf` del módulo.
Un archivo antiguo puede añadir recursos sin que lo esperes.
Antes de planificar, revisa todos los archivos del directorio.

### 8.4. Evidencias

Utiliza `evidencias/registro.md` para anotar observaciones.
No guardes secretos ni estados reales dentro de esa carpeta.

---

## 9. Configuración de Docker Compose

El servicio local se define en un archivo independiente de Terraform.

### 9.1. Archivo `compose.yaml`

La etiqueta siguiente es una referencia concreta para el ejemplo.
Debe sustituirse por la etiqueta probada por el curso cuando corresponda.

```yaml
services:
  localstack:
    image: localstack/localstack:4.0.0
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: s3,sts
      AWS_DEFAULT_REGION: us-east-1
```

### 9.2. Decisiones del ejemplo

El puerto se publica únicamente en la interfaz local.
No se monta el socket de Docker.
No se configura persistencia explícita.
No se declaran servicios ajenos al laboratorio.

### 9.3. Edición y autenticación

Algunas distribuciones, ediciones o funcionalidades pueden requerir autenticación.
Comprueba los requisitos de la imagen elegida antes de la clase.
No añadas un token a un archivo versionado.
Si la edición requiere un secreto, utiliza el procedimiento autorizado del centro.

### 9.4. Reproducibilidad

Una etiqueta concreta mejora la trazabilidad frente a `latest`.
Para un control más estricto, el equipo puede registrar también el digest.

---

## 10. Arranque y comprobación de LocalStack

El arranque del contenedor y la disponibilidad de la API son comprobaciones diferentes.

### 10.1. Validar y arrancar Compose

```bash
docker compose config
docker compose up -d
docker compose ps
```

### 10.2. Consultar registros

```bash
docker compose logs --tail=100 localstack
```

### 10.3. Consultar el endpoint de salud

```bash
curl --fail --silent --show-error \
  http://localhost:4566/_localstack/health
```

### 10.4. Interpretación prudente

La respuesta de salud depende de la versión.
El estado de algunos servicios puede cambiar tras la primera solicitud.
No exijas que todas las respuestas sean idénticas entre versiones.
La comprobación funcional de S3 será la evidencia principal para este ejercicio.

### 10.5. Si el arranque falla

Comprueba Docker, el puerto y los registros.
No cambies automáticamente a un endpoint externo.
No continúes con Terraform hasta resolver el problema local.

---

## 11. AWS CLI con un destino local explícito

La segunda herramienta permite comprobar el servicio sin depender del estado de Terraform.

### 11.1. Función de Bash

Define esta función en la terminal de la práctica:

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
    "$@"
}
```

> **Nota:** No se establece `AWS_PROFILE` porque `AWS_CONFIG_FILE=/dev/null` ya ignora cualquier perfil configurado. Establecer `AWS_PROFILE=` (vacío) causa error en AWS CLI v2: "The config profile () could not be found".

### 11.2. Primera consulta

```bash
aws_local s3api list-buckets
```

### 11.3. Alcance de la función

Las opciones se aplican a esa invocación.
No modifican permanentemente tus credenciales.
La función desaparece al cerrar la sesión de Bash.
Debes volver a definirla en una terminal nueva.

### 11.4. Resultado inicial

En un entorno limpio, la lista de buckets debería estar vacía.
Si aparecen recursos, registra su presencia y determina si el entorno es compartido.

---

## 12. Restricciones de Terraform y del provider

Declaremos las dependencias antes de configurar los recursos.

### 12.1. Archivo `versions.tf`

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

### 12.2. Lectura de la configuración

`required_version` limita Terraform CLI.
`source` identifica el provider.
`~> 5.0` permite versiones de la serie 5.
No fija exactamente la versión 5.0.0.

### 12.3. Selección efectiva

Terraform selecciona una versión compatible durante la inicialización.
El archivo de bloqueo conserva esa selección para posteriores ejecuciones.
Las restricciones y el bloqueo cumplen funciones complementarias.
Una restricción amplia no equivale a una versión exacta.

### 12.4. Ejercicio de interpretación

Explica por qué dos proyectos con la misma restricción pueden tener selecciones distintas.
Incluye el papel del archivo `.terraform.lock.hcl`.

---

## 13. Variables del laboratorio

Las entradas permiten adaptar el ejercicio sin reescribir el recurso.

### 13.1. Archivo `variables.tf`

```hcl
variable "aws_region" {
  description = "Región de referencia del laboratorio local."
  type        = string
  default     = "us-east-1"
}

variable "bucket_name" {
  description = "Nombre del bucket S3 de práctica."
  type        = string
  default     = "tf-aula-localstack-001"

  validation {
    condition = can(regex(
      "^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$",
      var.bucket_name
    ))
    error_message = "Usa entre 3 y 63 caracteres: minúsculas, números y guiones."
  }
}
```

### 13.2. Alcance de la validación

La expresión acepta un subconjunto sencillo de nombres.
No implementa todas las restricciones del servicio S3.
La API puede rechazar un valor que supere esta validación.
Las validaciones locales y las validaciones del servicio se complementan.

### 13.3. Nombres compartidos

Si varios alumnos usan la misma instancia, asigna nombres diferentes.
No emplees nombres, correos ni identificadores personales.

---

## 14. Configuración del provider de AWS

La conexión local debe aparecer de forma explícita y revisable.

### 14.1. Archivo `providers.tf`

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
    s3  = "http://localhost:4566"
    sts = "http://localhost:4566"
  }
}
```

### 14.2. Credenciales del ejemplo

Los valores se incluyen porque son ficticios y específicos del laboratorio.
Esta práctica no recomienda almacenar credenciales reales en HCL.
No reutilices este bloque para conectar con AWS real.

### 14.3. Opciones de omisión

Las opciones `skip_*` omiten comprobaciones concretas.
No eliminan todos los posibles accesos externos.
Su uso debe revisarse si se añaden servicios.

### 14.4. Comprobación previa

Confirma que solo se declaran recursos S3.
Confirma que el endpoint S3 apunta al servicio local.

---

## 15. Direccionamiento S3 y significado de `localhost`

Una parte importante de los errores iniciales procede de la red.

### 15.1. Direccionamiento por ruta

Con direccionamiento por ruta, el bucket aparece dentro de la ruta de la solicitud.
Conceptualmente:

```text
http://localhost:4566/nombre-del-bucket/objeto.txt
```

### 15.2. Direccionamiento por nombre de host

Otra modalidad incorpora el bucket al nombre del servidor.
Conceptualmente:

```text
http://nombre-del-bucket.servidor/objeto.txt
```

Esa modalidad requiere una resolución de nombres adecuada.
Por eso el ejemplo utiliza `s3_use_path_style = true`.

### 15.3. Terraform dentro de un contenedor

Dentro de otro contenedor, `localhost` no identifica al contenedor de LocalStack.
Si ambos servicios comparten una red Compose, puede utilizarse el nombre del servicio.
Por ejemplo, el endpoint podría ser `http://localstack:4566`.
Ese cambio requiere adaptar la arquitectura completa.

### 15.4. Regla del curso

No mezcles instrucciones para ejecución anfitriona y ejecución contenerizada.
Documenta siempre desde dónde se ejecuta cada herramienta.

---

## 16. Recurso S3 principal

El bucket será el único recurso gestionado en la primera ejecución.

### 16.1. Archivo `main.tf`

```hcl
resource "aws_s3_bucket" "laboratorio" {
  bucket        = var.bucket_name
  force_destroy = false

  tags = {
    Curso   = "Terraform"
    Entorno = "LocalStack"
    Leccion = "TerraformAWSLocalStack"
  }
}
```

### 16.2. Elementos del bloque

`aws_s3_bucket` identifica el tipo de recurso.
`laboratorio` es la etiqueta local de Terraform.
`bucket` configura el nombre del recurso en S3.
`tags` añade metadatos.

### 16.3. Dirección dentro de Terraform

```text
aws_s3_bucket.laboratorio
```

Esta dirección no es el nombre del bucket.
Sirve para identificar la declaración y su correspondencia en el estado.

### 16.4. Decisión de limpieza

`force_destroy = false` evita solicitar el vaciado automático mediante este recurso.
No impide destruir un bucket vacío.
Si añades objetos, deberás revisar su eliminación antes de destruir el bucket.

---

## 17. Salidas del módulo

Las salidas exponen información seleccionada de la configuración gestionada.

### 17.1. Archivo `outputs.tf`

```hcl
output "bucket_name" {
  description = "Nombre del bucket gestionado."
  value       = aws_s3_bucket.laboratorio.bucket
}

output "bucket_arn" {
  description = "ARN informado para el bucket."
  value       = aws_s3_bucket.laboratorio.arn
}

output "s3_endpoint" {
  description = "Endpoint local utilizado en esta práctica."
  value       = "http://localhost:4566"
}
```

### 17.2. Diferencia entre las salidas

Las dos primeras dependen del recurso.
La tercera es un valor estático de documentación.
Mostrar un endpoint en una salida no configura la conexión.
La conexión efectiva se define en el provider.

### 17.3. Limitación importante

Consultar una salida no realiza necesariamente una consulta nueva a la API.
Las salidas habituales se leen del estado.
Por eso utilizaremos también AWS CLI para verificar el servicio.

---

## 18. Archivos locales y control de versiones

El repositorio debe conservar intención, no publicar información sensible.

### 18.1. Archivo `.gitignore`

```gitignore
.terraform/
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

### 18.2. Archivos que normalmente se conservan

- Archivos `.tf`.
- `compose.yaml`.
- `.terraform.lock.hcl`.
- Documentación.
- Ejemplos de variables sin secretos.
- Evidencias previamente revisadas.

### 18.3. Precauciones

Un archivo ignorado puede seguir registrado si ya estaba en Git.
Las exclusiones no borran la historia.
El estado puede contener valores sensibles.
Los planes guardados también deben tratarse como archivos potencialmente sensibles.

### 18.4. Ejemplo compartible

Un archivo `terraform.tfvars.example` puede documentar valores ficticios.
Su contenido debe revisarse antes de publicarse.

---

## 19. Inicialización del proyecto

La inicialización prepara dependencias y metadatos del directorio.

### 19.1. Ejecutar `init`

```bash
terraform init
```

### 19.2. Qué hace

Terraform prepara el backend configurado.
Descarga los providers necesarios cuando no están disponibles.
Genera o utiliza el archivo de bloqueo.
Crea información local dentro de `.terraform/`.

### 19.3. Qué no demuestra

La inicialización no crea el bucket.
Tampoco demuestra que el endpoint S3 funcione.
Puede finalizar correctamente aunque LocalStack no esté arrancado.
La descarga del provider y la conexión con el emulador son operaciones distintas.

### 19.4. Revisar dependencias

```bash
terraform providers
```

### 19.5. Actualización deliberada

`terraform init -upgrade` permite reconsiderar versiones dentro de las restricciones.
No lo utilices automáticamente al comienzo de cada práctica.
Registra y revisa los cambios del archivo de bloqueo.

---

## 20. Formateo y validación

Las comprobaciones estáticas detectan algunos errores antes del plan.

### 20.1. Aplicar formato

```bash
terraform fmt
```

### 20.2. Comprobar el formato

```bash
terraform fmt -check
```

El primer comando puede modificar archivos.
El segundo comprueba si necesitan cambios.
Son útiles en momentos distintos del trabajo.

### 20.3. Validar la configuración

```bash
terraform validate
```

### 20.4. Interpretación

La validación comprueba sintaxis y coherencia de la configuración.
No sustituye las validaciones de la API.
No confirma que el puerto local esté disponible.
No demuestra que un recurso pueda crearse.

### 20.5. Actividad breve

Introduce temporalmente un atributo mal escrito.
Observa el mensaje de validación.
Corrige el archivo antes de continuar.

---

## 21. Planificación y revisión de cambios

El plan permite discutir operaciones antes de ejecutarlas.

### 21.1. Generar un plan

```bash
terraform plan
```

### 21.2. Símbolos habituales

La tabla ofrece una referencia inicial para leer cambios.

| **Símbolo** | **Interpretación** | **Pregunta de revisión** |
|-------------|--------------------|--------------------------|
| `+` | Creación | ¿Qué objeto se añadirá? |
| `~` | Actualización | ¿Qué atributos cambiarán? |
| `-` | Destrucción | ¿Qué objeto desaparecerá? |
| `-/+` | Reemplazo | ¿Por qué no basta actualizar? |

Un reemplazo puede aparecer con otro orden según la estrategia aplicada.
Lee siempre la explicación y el resumen completo.

### 21.3. Valores desconocidos

Algunos atributos aparecen como conocidos después de aplicar.
No inventes su valor.
No confundas desconocido con vacío.
No todos los atributos pueden calcularse durante la planificación.

### 21.4. Expectativa del primer plan

En un directorio y estado limpios, se espera crear el bucket.
Las salidas también aparecerán como nuevas.
La evidencia válida es el plan observado en tu entorno.

---

## 22. Aplicación interactiva y planes guardados

Existen dos formas habituales de aplicar cambios revisados.

### 22.1. Aplicación interactiva

```bash
terraform apply
```

Terraform genera un plan y solicita confirmación.
Lee el plan mostrado antes de responder.
Para aprobar, utiliza la confirmación exacta que solicite la herramienta.

### 22.2. Aplicación de un plan guardado

```bash
terraform plan -out=creacion.tfplan
terraform show creacion.tfplan
terraform apply creacion.tfplan
```

### 22.3. Diferencia importante

Aplicar un plan guardado no solicita la confirmación interactiva habitual.
La revisión debe ocurrir antes del último comando.
No ejecutes automáticamente una cadena completa sin inspección.
Si cambian las condiciones relevantes, genera y revisa otro plan.

### 22.4. Regla para alumnado

En las primeras prácticas, utiliza el modo interactivo salvo indicación docente.
No emplees `-auto-approve`.
La confirmación no reemplaza la comprensión del plan.

---

## 23. Verificación del recurso creado

Verificar consiste en reunir evidencias que responden preguntas diferentes.

### 23.1. Consultar salidas

```bash
terraform output
terraform output -raw bucket_name
```

### 23.2. Consultar recursos registrados

```bash
terraform state list
terraform state show aws_s3_bucket.laboratorio
```

### 23.3. Consultar S3 mediante AWS CLI

```bash
aws_local s3api list-buckets
aws_local s3api head-bucket \
  --bucket tf-aula-localstack-001
aws_local s3api get-bucket-tagging \
  --bucket tf-aula-localstack-001
```

### 23.4. Resultado esperado

El listado debe incluir el nombre configurado.
`head-bucket` puede terminar correctamente sin mostrar contenido.
La consulta de etiquetas debe devolver los valores declarados.
Si cambiaste el nombre, adapta los comandos.

### 23.5. Qué no se demuestra

Estas consultas no validan políticas reales de IAM.
Tampoco prueban durabilidad, disponibilidad o rendimiento de AWS.

---

## 24. Configuración, estado y recursos observados

Los tres elementos deben estudiarse por separado.

### 24.1. Configuración

Los archivos `.tf` describen la intención.
Pueden existir aunque todavía no se haya creado ningún recurso.
Modificar un archivo no modifica inmediatamente el servicio.

### 24.2. Estado

El estado conserva relaciones e información de recursos gestionados.
No es simplemente una copia de los archivos HCL.
Puede contener atributos que no escribiste explícitamente.
No debe editarse manualmente como una práctica rutinaria.

### 24.3. Servicio local

LocalStack contiene los objetos observados por sus APIs.
Un recurso puede existir allí sin estar gestionado por este proyecto.
También puede desaparecer mientras el estado conserva referencias antiguas.

### 24.4. Actividad de comparación

Localiza el nombre del bucket en:

- La configuración.
- La salida de Terraform.
- La respuesta de AWS CLI.

### 24.5. Reflexión

Explica qué ocurriría si se borrara solo el archivo `main.tf`.
Distingue la edición del archivo de la siguiente aplicación.

---

## 25. Cambios controlados y convergencia

Un cambio pequeño permite estudiar el ciclo completo.

### 25.1. Modificación de etiquetas

Añade al mapa `tags`:

```hcl
Practica = "CambioControlado"
```

### 25.2. Revisión y aplicación

```bash
terraform fmt
terraform validate
terraform plan
terraform apply
```

### 25.3. Comprobación independiente

```bash
aws_local s3api get-bucket-tagging \
  --bucket tf-aula-localstack-001
```

### 25.4. Plan posterior

```bash
terraform plan
```

Después de aplicar correctamente, se espera que no haya nuevos cambios.
Eso indica convergencia dentro del alcance evaluado.
No constituye una auditoría completa de seguridad.

### 25.5. Cambio de nombre

Cambiar el nombre del bucket normalmente implica reemplazarlo con este recurso.
Genera un plan para observarlo, pero no lo apliques en esta actividad.
Restablece el nombre antes de continuar.

---

## 26. Práctica opcional con objetos S3

Esta ampliación permite comprobar que un bucket contiene objetos recuperables.

### 26.1. Condición previa

Completa primero la verificación del bucket vacío.
La práctica utiliza un archivo ficticio.
No subas documentos personales ni materiales reservados.

### 26.2. Crear y subir contenido

```bash
printf 'Contenido ficticio del laboratorio.\n' > mensaje.txt

aws_local s3api put-object \
  --bucket tf-aula-localstack-001 \
  --key practicas/mensaje.txt \
  --body mensaje.txt
```

### 26.3. Consultar y descargar

```bash
aws_local s3api list-objects-v2 \
  --bucket tf-aula-localstack-001

aws_local s3api get-object \
  --bucket tf-aula-localstack-001 \
  --key practicas/mensaje.txt \
  mensaje-descargado.txt

cmp mensaje.txt mensaje-descargado.txt
```

### 26.4. Interpretación

Estos objetos no están declarados como recursos Terraform.
Su creación mediante AWS CLI no los incorpora automáticamente al estado.
La limpieza debe tener en cuenta esa diferencia.

---

## 27. Drift y cambios realizados fuera de Terraform

El drift aparece cuando el recurso observado se desvía de la configuración gestionada.

### 27.1. Modificación local de etiquetas

En un laboratorio individual, puedes sustituir las etiquetas mediante:

```bash
aws_local s3api put-bucket-tagging \
  --bucket tf-aula-localstack-001 \
  --tagging '{"TagSet":[{"Key":"Entorno","Value":"CambioExterno"}]}'
```

### 27.2. Detectar la diferencia

```bash
terraform plan
```

### 27.3. Interpretación

Compara las etiquetas del archivo con las observadas.
Identifica qué cambios propone Terraform.
No describas la operación como un fallo sin analizar su origen.
El servicio fue modificado mediante otra herramienta.

### 27.4. Restauración revisada

Aplica solo después de confirmar que quieres recuperar la configuración declarada.
Después consulta nuevamente las etiquetas.
Registra qué herramienta realizó cada modificación.

### 27.5. Limitaciones

Terraform no supervisa continuamente todos los cambios.
La detección depende del provider, de los atributos y de los permisos.
No todos los comportamientos externos son necesariamente observables.

---

## 28. Limpieza del laboratorio

La destrucción debe ser tan comprensible como la creación.

### 28.1. Eliminar el objeto opcional

Si completaste la práctica de objetos:

```bash
aws_local s3api delete-object \
  --bucket tf-aula-localstack-001 \
  --key practicas/mensaje.txt

aws_local s3api list-objects-v2 \
  --bucket tf-aula-localstack-001
```

### 28.2. Revisar y destruir recursos

```bash
terraform plan -destroy
terraform destroy
```

Lee la propuesta antes de confirmar.
Comprueba que solo afecta al laboratorio previsto.
No cambies `force_destroy` para evitar investigar un error de limpieza.

### 28.3. Verificar el resultado

```bash
terraform state list
aws_local s3api list-buckets
```

### 28.4. Detener LocalStack

```bash
docker compose down
```

Destruye y verifica antes de detener el servicio.

---

## 29. Persistencia y pérdida del entorno local

El ciclo de vida del contenedor no es el ciclo de vida del estado.

### 29.1. Configuración de esta lección

No hemos configurado persistencia explícita de LocalStack.
No debes asumir que los recursos sobreviven a una recreación.
La conservación de datos debe probarse con la versión y configuración elegidas.

### 29.2. Situación problemática

Puede ocurrir esta secuencia:

1. Terraform crea un bucket.
2. El estado registra el recurso.
3. LocalStack se recrea y pierde los datos.
4. El estado sigue existiendo.
5. El siguiente plan observa un entorno diferente.

### 29.3. Procedimiento prudente

Consulta primero el servicio local.
Genera un plan.
Interpreta las diferencias.
No borres el estado para ocultar el problema.
No utilices comandos de manipulación de estado sin comprender sus efectos.

### 29.4. Ampliación futura

La persistencia puede estudiarse en otra unidad.
No basta con añadir un volumen arbitrario.
Hay que documentar rutas, opciones admitidas y comportamiento comprobado.

---

## 30. Diagnóstico de errores frecuentes

El diagnóstico empieza por evidencias, no por cambios aleatorios.

### 30.1. Tabla orientativa

La tabla relaciona síntomas y primeras comprobaciones.

| **Síntoma** | **Qué comprobar** | **Qué evitar** |
|-------------|------------------|----------------|
| Conexión rechazada | Contenedor y puerto | Cambiar a AWS real |
| Puerto ocupado | Procesos y contenedores | Detener servicios ajenos |
| Error de descarga | Red y restricciones | Borrar todos los archivos |
| Nombre rechazado | Variable y reglas S3 | Inventar otra causa |
| Bucket no vacío | Objetos existentes | Forzar sin revisar |
| Recurso inesperado | Directorio y estado | Aplicar automáticamente |

Estas comprobaciones orientan la investigación.
No confirman por sí solas una causa.

### 30.2. Registro mínimo de un error

Anota:

- Comando ejecutado.
- Mensaje completo saneado.
- Directorio.
- Versión.
- Hipótesis.
- Comprobación realizada.
- Resultado observado.

### 30.3. Regla de trabajo

Cambia una condición relevante cada vez.
Así podrás explicar qué resolvió el problema.

---

## 31. Diferencias respecto a AWS real

El emulador facilita el aprendizaje, pero tiene límites importantes.

### 31.1. Comparación de entornos

La tabla resume diferencias que deben mantenerse visibles.

| **Aspecto** | **Laboratorio local** | **AWS real** |
|-------------|------------------------|--------------|
| Identidad | Credenciales ficticias | Identidades y permisos reales |
| Destino | Endpoint local | Endpoints de AWS |
| Costes | Recursos del equipo | Facturación según uso |
| Compatibilidad | Dependiente del emulador | Servicio administrado |
| Operación | Entorno de práctica | Responsabilidad operativa |

El laboratorio permite estudiar procedimientos.
No demuestra equivalencia completa entre ambos entornos.

### 31.2. Seguridad

No utilices respuestas locales para concluir que una política IAM es correcta.
No presupongas reproducción completa de cifrado, auditoría o controles de acceso.
Las comprobaciones reales necesitan un entorno autorizado específico.

### 31.3. Rendimiento y disponibilidad

Los tiempos locales no representan los tiempos de AWS.
Las pruebas locales no validan cuotas ni acuerdos de servicio.
Tampoco demuestran recuperación ante fallos regionales.

### 31.4. Transición futura

La transición a AWS requiere una lección de identidad, permisos, costes y limpieza.
No consiste únicamente en borrar el bloque `endpoints`.

---

## 32. Sesiones guiadas para el alumnado

Las sesiones distribuyen el trabajo en objetivos observables.

### 32.1. Sesión A: preparar y explicar

Duración orientativa: 25 minutos.

1. Comprueba herramientas y versiones.
2. Arranca LocalStack.
3. Consulta S3 mediante `aws_local`.
4. Dibuja el recorrido de una solicitud.
5. Registra el endpoint y las limitaciones.

Entrega el diagrama y dos evidencias de disponibilidad.

### 32.2. Sesión B: crear y verificar

Duración orientativa: 40 minutos.

1. Escribe los archivos Terraform.
2. Inicializa, formatea y valida.
3. Interpreta el plan.
4. Aplica tras una revisión por parejas.
5. Comprueba el bucket desde AWS CLI.

Entrega el código y una explicación de cada evidencia.

### 32.3. Sesión C: modificar y limpiar

Duración orientativa: 30 minutos.

Modifica etiquetas, revisa el plan y comprueba el cambio.
Después elimina objetos opcionales, destruye el bucket y verifica la limpieza.
Entrega un registro que distinga actualización, destrucción y detención del servicio.

---

## 33. Ejercicios de refuerzo y revisión

Los ejercicios deben resolverse con evidencias, no solo con respuestas memorizadas.

### 33.1. Ejercicio de identificación

Explica la función de:

- `required_providers`.
- `endpoints`.
- `s3_use_path_style`.
- `.terraform.lock.hcl`.
- `terraform state list`.

### 33.2. Ejercicio de aislamiento

Un compañero añade un recurso EC2 a esta configuración.
Identifica por qué no debe ejecutarlo todavía.
Explica qué revisiones faltan antes de ampliar el laboratorio.

### 33.3. Ejercicio de interpretación

Compara cambiar una etiqueta con cambiar el nombre del bucket.
Genera planes por separado.
No apliques el reemplazo.
Documenta la diferencia observada.

### 33.4. Ejercicio con asistente de IA

Utiliza un fragmento ficticio y esta instrucción:

```text
Explica las operaciones del plan para un estudiante principiante.
No ejecutes acciones ni inventes atributos desconocidos.
Distingue Terraform, AWS y LocalStack.
Indica qué comprobaciones humanas faltan antes de aplicar.
```

Verifica la explicación contra el plan.

---

## 34. Evaluación, resumen y cierre

La evaluación combina funcionamiento, comprensión y uso responsable.

### 34.1. Rúbrica de la práctica

Valora cada criterio entre cero y dos puntos.

| **Criterio** | **0 puntos** | **1 punto** | **2 puntos** |
|-------------|--------------|-------------|-------------|
| Configuración | No operativa | Requiere ajustes | Cumple el laboratorio |
| Interpretación | No explica cambios | Explicación parcial | Explicación fundamentada |
| Verificación | Sin evidencias | Evidencias incompletas | Comprobaciones independientes |
| Seguridad | Incumple límites | Cumplimiento parcial | Respeta los controles |
| Documentación | No reproducible | Faltan detalles | Permite repetir la práctica |

Una puntuación alta no compensa una ejecución no autorizada.
La exposición de secretos debe tratarse como un fallo crítico.

### 34.2. Lista final

- Utilicé credenciales ficticias.
- Confirmé los endpoints locales.
- Revisé los planes antes de aplicar.
- Consulté el recurso desde AWS CLI.
- Documenté las versiones y las limitaciones.
- Verifiqué la limpieza antes de detener LocalStack.

### 34.3. Idea principal

Terraform describe y gestiona; el provider conecta; LocalStack emula.
La calidad del trabajo depende de comprender y comprobar cada paso.
**Escribe, revisa, aplica, verifica y documenta.**