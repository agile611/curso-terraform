# Configuración de AWS CLI y awslocal para trabajar con Terraform y LocalStack

> Curso de Terraform con LocalStack emulando servicios de AWS.
> Todas las prácticas de esta lección se ejecutan localmente.
> No necesitas una cuenta de AWS para completar los ejercicios.
> Utiliza credenciales ficticias y endpoints explícitamente locales.
> Una prueba local satisfactoria no equivale a validar AWS real.

AWS CLI permite enviar solicitudes a las APIs de servicios.
awslocal simplifica algunas de esas solicitudes cuando el destino es LocalStack.
Terraform utiliza su propio provider, pero puede apoyarse en estas herramientas para verificar resultados.

Esta lección explica cómo preparar clientes, configurar un perfil local y comprobar sus destinos.
También incluye ejercicios de consulta, creación, descarga y limpieza de recursos S3.
El objetivo es distinguir lo solicitado, lo ejecutado y lo verificado.

Los comandos principales utilizan Bash.
AWS CLI, awslocal y Terraform se ejecutan en el equipo anfitrión.
LocalStack se ejecuta dentro de Docker.

---

## 1. Objetivos de aprendizaje

Esta unidad prepara un procedimiento de consulta local que puedas repetir y documentar.

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Explicar la función de AWS CLI.
- Explicar la función de awslocal.
- Diferenciar credenciales, región, perfil y endpoint.
- Reconocer cuándo una configuración puede heredarse del entorno.
- Distinguir clientes de consulta y herramientas de gestión declarativa.

### 1.2. Objetivos prácticos

También podrás:

- Configurar un perfil con credenciales ficticias.
- Ejecutar consultas contra LocalStack.
- Crear y comprobar recursos de práctica.
- Comparar AWS CLI y awslocal.
- Verificar recursos creados mediante Terraform.
- Limpiar el laboratorio con un alcance explícito.

---

## 2. Alcance de la lección

El laboratorio utiliza S3 para concentrarse en configuración y verificación.

### 2.1. Herramientas utilizadas

Trabajaremos con:

- AWS CLI.
- awslocal.
- Docker Compose.
- LocalStack.
- Terraform.
- Python y pipx cuando corresponda.
- Bash.

### 2.2. Recursos de práctica

Crearemos un bucket para operaciones de CLI.
Dentro de él utilizaremos un archivo ficticio.
Después crearemos otro bucket mediante Terraform.
Los nombres de ambos recursos serán diferentes.

### 2.3. Exclusiones

No configuraremos identidades reales de AWS.
No validaremos políticas IAM de producción.
No utilizaremos recursos de clientes ni información personal.
No importaremos recursos existentes al estado de Terraform.

---

## 3. Requisitos previos

Comprueba que el entorno de las lecciones anteriores está disponible.

### 3.1. Conocimientos necesarios

Debes saber:

- Abrir una terminal.
- Crear y editar archivos.
- Cambiar de directorio.
- Ejecutar Docker Compose.
- Identificar un puerto local.
- Interpretar errores básicos.

### 3.2. Herramientas necesarias

Prepara:

- Docker con su motor iniciado.
- Docker Compose.
- AWS CLI versión 2 para la ruta principal.
- Python compatible con pipx.
- Terraform compatible con la configuración.
- Un editor de texto.

### 3.3. Condición docente

El docente debe probar la combinación de versiones antes de impartir la sesión.
Esta página no afirma haber ejecutado los comandos en tu equipo.

---

## 4. Arquitectura del laboratorio

Los clientes compartirán un servicio local, pero conservarán responsabilidades diferentes.

### 4.1. Recorrido de las solicitudes

```text
Equipo anfitrión
├── AWS CLI ─────────────────────────┐
├── awslocal ── AWS CLI compatible ───┤
└── Terraform ── Provider AWS ────────┤
                                    ▼
                          http://localhost:4566
                                    ▼
                              LocalStack
                                    ▼
                                S3 local
```

### 4.2. Separación importante

AWS CLI y awslocal permiten consultar y ejecutar operaciones.
Terraform mantiene relaciones de gestión mediante su estado.
Consultar un recurso no lo incorpora al estado.
Crear un objeto mediante CLI tampoco lo convierte automáticamente en un recurso Terraform.

---

## 5. Qué es AWS CLI

AWS CLI es un cliente para ejecutar operaciones de servicios desde una terminal.

### 5.1. Estructura de los comandos

La estructura general es:

```text
aws [opciones globales] servicio operacion [parametros]
```

### 5.2. Ejemplo local

```bash
aws \
  --endpoint-url http://localhost:4566 \
  --region us-east-1 \
  s3api list-buckets
```

### 5.3. Qué representa cada parte

`aws` identifica el ejecutable.
`--endpoint-url` indica el destino de esa invocación.
`--region` indica la región utilizada por el cliente.
`s3api` selecciona el conjunto de operaciones.
`list-buckets` selecciona una operación concreta.

---

## 6. Qué es awslocal

awslocal es un envoltorio pensado para facilitar el uso de AWS CLI con LocalStack.

### 6.1. Función principal

Conserva una estructura de comandos semejante a AWS CLI.
Añade comportamiento orientado al entorno local.
Puede reducir la repetición de determinadas opciones.
Su comportamiento exacto depende de la versión instalada.

### 6.2. Ejemplo conceptual

```bash
awslocal s3api list-buckets
```

### 6.3. Límite de seguridad

El nombre awslocal no constituye un cortafuegos.
No demuestra por sí solo dónde se realizó una solicitud.
Debes conocer su configuración y comprobar el destino.
En este curso mantendremos un endpoint explícito en los ejemplos importantes.

### 6.4. Relación con AWS CLI

awslocal no sustituye al servicio emulado.
Tampoco sustituye al provider de Terraform.
Su instalación puede utilizar una AWS CLI distinta de la disponible globalmente.

---

## 7. Comparación de los clientes

La elección depende de claridad, compatibilidad y procedimiento del curso.

### 7.1. Tabla comparativa

| **Aspecto** | **AWS CLI** | **awslocal** |
|-------------|-------------|--------------|
| Finalidad | Cliente general de APIs | Facilitar llamadas locales |
| Destino local | Se declara con opciones o configuración | Incorpora comportamiento local |
| Sintaxis de servicios | Sintaxis de AWS CLI | Habitualmente conserva esa sintaxis |
| Dependencias | Instalación propia | Depende de su empaquetado |
| Verificación | Revisar endpoint y entorno | Revisar versión, endpoint y entorno |

Ambas herramientas requieren comprobaciones.
La comodidad no sustituye el aislamiento.

### 7.2. Regla de la lección

AWS CLI con endpoint explícito será la referencia.
awslocal se utilizará como alternativa comparativa.
Si ambos clientes difieren, investigaremos antes de atribuir la causa a LocalStack.

### 7.3. Resultado esperado

Las consultas equivalentes deben describir el mismo recurso local.
El formato o el orden de ciertos elementos puede variar.

---

## 8. Credenciales, región, perfil y endpoint

Estos elementos resuelven preguntas distintas.

### 8.1. Credenciales

Permiten al cliente firmar solicitudes.
En esta práctica serán ficticias.
Utilizaremos `test` como clave y secreto.
No representan una identidad válida de AWS.

### 8.2. Región

Utilizaremos `us-east-1` como referencia.
La región forma parte de la configuración de las solicitudes.
No convierte LocalStack en una región real.
Su comportamiento debe comprobarse en el emulador.

### 8.3. Perfil

Un perfil agrupa configuración con un nombre.
No es una cuenta por sí mismo.
Tampoco garantiza un destino local.

### 8.4. Endpoint

El endpoint indica dónde se envía la solicitud correspondiente.
En la práctica será `http://localhost:4566`.
Debe revisarse independientemente de las credenciales y el perfil.

---

## 9. Configuración heredada del entorno

Una terminal puede contener valores procedentes de otros proyectos.

### 9.1. Fuentes habituales

AWS CLI puede utilizar:

- Opciones de línea de comandos.
- Variables de entorno.
- Archivos de configuración.
- Archivos de credenciales.
- Mecanismos de identidad compatibles.
- Información de determinados entornos de ejecución.

### 9.2. Consecuencia práctica

Seleccionar un perfil no elimina necesariamente todas las variables relevantes.
Una variable heredada puede cambiar la región o las credenciales.
La precedencia depende del parámetro y del mecanismo utilizado.
No memorices una regla universal simplificada.

### 9.3. Procedimiento del curso

Usaremos archivos locales exclusivos del laboratorio.
Para la referencia principal, definiremos credenciales ficticias por invocación.
También declararemos el endpoint explícitamente.
Los controles externos de red siguen siendo necesarios cuando el riesgo lo exige.

---

## 10. Preparar un directorio exclusivo

Separar archivos evita modificar accidentalmente configuraciones personales.

### 10.1. Crear la carpeta

```bash
mkdir -p ~/cursos/terraform/awscli-awslocal/evidencias
cd ~/cursos/terraform/awscli-awslocal
```

### 10.2. Estructura prevista

```text
awscli-awslocal/
├── compose.yaml
├── .env
├── .env.example
├── .gitignore
├── .aws-local/
│   ├── config
│   └── credentials
├── versions.tf
├── providers.tf
├── main.tf
├── outputs.tf
└── evidencias/
    └── registro.md
```

---

## 11. Comprobar AWS CLI

Antes de configurar el cliente, identifica qué ejecutable utilizas.

### 11.1. Consultas básicas

```bash
command -v aws
type -a aws
aws --version
```

### 11.2. Interpretación

`command -v` muestra la selección habitual.
`type -a` puede revelar varias instalaciones.
La versión debe anotarse en el registro.
La ruta principal del curso utiliza AWS CLI versión 2.

### 11.3. Instalaciones duplicadas

Una instalación antigua puede aparecer antes en `PATH`.
No borres ejecutables sin conocer su procedencia.
Utiliza el gestor con el que se instalaron.
Abre una terminal nueva después de cambios relevantes.

### 11.4. Criterio de avance

No continúes si el comando no se encuentra.
Resuelve primero instalación, ruta o permisos.

---

## 12. Preparar pipx para awslocal

pipx permite instalar aplicaciones Python en entornos separados.

### 12.1. Comprobar disponibilidad

```bash
python3 --version
pipx --version
```

### 12.2. Instalación en Ubuntu o WSL

Si está autorizada y el paquete está disponible:

```bash
sudo apt-get update
sudo apt-get install -y pipx python3-venv
pipx ensurepath
```

### 12.3. Instalación en macOS

Si utilizas Homebrew autorizado:

```bash
brew install pipx
pipx ensurepath
```

### 12.4. Finalización

Abre una terminal nueva.
Comprueba nuevamente `pipx --version`.
No instales paquetes Python como administrador para evitar problemas de entorno.

---

## 13. Instalar awslocal de forma aislada

Esta ruta prioriza una combinación empaquetada y separada de la AWS CLI principal.

### 13.1. Instalación de referencia

Ejecuta:

```bash
pipx install 'awscli-local[ver1]'
```

### 13.2. Qué implica esta elección

El extra `ver1` incorpora AWS CLI versión 1 como dependencia.
La AWS CLI versión 2 del equipo puede seguir instalada.
No debes asumir que ambos comandos utilizan la misma implementación.
Registra esa diferencia.

### 13.3. Comprobaciones

```bash
command -v awslocal
awslocal --version
pipx list
```

### 13.4. Política del curso

Si el docente utiliza otra modalidad compatible, debe documentarla.
No generalices compatibilidad con AWS CLI versión 2 a cualquier versión de awslocal.
Comprueba la combinación concreta antes de la sesión.

---

## 14. Interpretar las versiones observadas

La salida de versión no cuenta toda la historia del empaquetado.

### 14.1. Datos que debes conservar

Registra:

- Versión de AWS CLI global.
- Ruta del ejecutable `aws`.
- Paquete `awscli-local` instalado.
- Entorno utilizado por pipx.
- Salida de `awslocal --version`.

### 14.2. Matiz importante

La salida de awslocal puede mostrar la versión del cliente subyacente.
No debe interpretarse automáticamente como la versión del envoltorio.
Utiliza también los datos del gestor de instalación.
Si necesitas inspeccionar dependencias:

```bash
pipx runpip awscli-local show awscli-local awscli
```

### 14.3. Comparación justa

Las diferencias entre AWS CLI versión 1 y versión 2 deben quedar visibles.
No atribuyas cualquier diferencia de salida al endpoint o al emulador.

---

## 15. Preparar LocalStack

Utiliza una imagen concreta proporcionada por el curso.

### 15.1. Archivo `.env.example`

```dotenv
COMPOSE_PROJECT_NAME=aula-cli-local
LOCALSTACK_IMAGE=localstack/localstack:ETIQUETA_PROBADA
LOCALSTACK_PORT=4566
```

### 15.2. Crear `.env`

```bash
cp .env.example .env
```

### 15.3. Sustituir el marcador

Edita `.env` y reemplaza `ETIQUETA_PROBADA`.
No continúes conservando ese marcador.
El docente debe comprobar versión, edición y disponibilidad de S3.
Si hay requisitos de autenticación, seguirá el procedimiento autorizado.

### 15.4. Reproducibilidad

No utilices `latest` para describir una combinación estable.
Una referencia concreta mejora la trazabilidad.
La compatibilidad funcional sigue necesitando comprobaciones.

---

## 16. Arrancar el servicio con Compose

El servicio se publica únicamente en la interfaz local.

### 16.1. Archivo `compose.yaml`

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

### 16.2. Arranque

```bash
docker compose config --quiet
docker compose pull
docker compose up -d
docker compose ps
```

### 16.3. Alcance

No se configura persistencia explícita.
No se monta el socket de Docker.
No se añaden servicios ajenos al ejercicio.

---

## 17. Observar LocalStack antes de consultar

El estado del contenedor es una evidencia inicial, no una prueba completa.

### 17.1. Consultar registros y puerto

```bash
docker compose logs --tail=100 localstack
docker compose port localstack 4566
```

### 17.2. Definir endpoint de la terminal

```bash
export LOCALSTACK_ENDPOINT="http://localhost:4566"
```

### 17.3. Consulta auxiliar de salud

```bash
curl --fail --silent --show-error \
  "${LOCALSTACK_ENDPOINT}/_localstack/health"
```

### 17.4. Interpretación

La respuesta de salud depende de la versión.
Un contenedor iniciado puede seguir inicializando servicios.
La siguiente consulta S3 será la comprobación funcional.
Si cambiaste el puerto, adapta el endpoint.

---

## 18. Crear archivos locales de AWS CLI

No utilizaremos los archivos personales de credenciales del alumno.

### 18.1. Crear el directorio privado

```bash
mkdir -p .aws-local
chmod 700 .aws-local
```

### 18.2. Archivo `.aws-local/credentials`

```ini
[localstack]
aws_access_key_id = test
aws_secret_access_key = test
```

### 18.3. Archivo `.aws-local/config`

```ini
[profile localstack]
region = us-east-1
output = json
s3 =
    addressing_style = path
```

### 18.4. Observación

Las cabeceras de perfil difieren entre ambos archivos.
Conserva exactamente la estructura del ejemplo.

---

## 19. Activar los archivos del laboratorio

La terminal debe saber dónde encontrar la configuración local.

### 19.1. Variables de ruta

Desde la carpeta del proyecto:

```bash
export AWS_CONFIG_FILE="$PWD/.aws-local/config"
export AWS_SHARED_CREDENTIALS_FILE="$PWD/.aws-local/credentials"
export AWS_EC2_METADATA_DISABLED=true
```

### 19.2. Permisos

```bash
chmod 600 .aws-local/config .aws-local/credentials
```

### 19.3. Alcance

Estas variables afectan a procesos iniciados desde esta terminal.
No cambian automáticamente otras terminales.
No modifican los archivos personales del usuario.
Una nueva sesión necesita repetir la preparación.

### 19.4. Precaución

No exportes credenciales reales para este ejercicio.
No ejecutes `aws configure` sobre un perfil personal.
Mantén la práctica separada de proyectos reales.

---

## 20. Inspeccionar el perfil local

La inspección permite comprobar valores y fuentes.

### 20.1. Consultas

```bash
aws configure list-profiles
aws configure get region --profile localstack
aws configure get output --profile localstack
aws configure get s3.addressing_style --profile localstack
```

### 20.2. Resultado esperado

Debe aparecer el perfil `localstack`.
La región debe ser `us-east-1`.
El formato debe ser `json`.
El estilo de direccionamiento debe ser `path`.

### 20.3. Fuentes de configuración

También puedes ejecutar:

```bash
aws configure list --profile localstack
```

### 20.4. Seguridad

Revisa la salida antes de compartirla.
No utilices inspecciones de configuración de proyectos reales como material de clase.

---

## 21. Definir una referencia segura para AWS CLI

La función siguiente evita repetir opciones y mantiene visibles las decisiones importantes.

### 21.1. Función `aws_local`

```bash
aws_local() {
  AWS_ACCESS_KEY_ID=test \
  AWS_SECRET_ACCESS_KEY=test \
  AWS_SESSION_TOKEN= \
  AWS_PROFILE= \
  AWS_EC2_METADATA_DISABLED=true \
  aws \
    --profile localstack \
    --endpoint-url "${LOCALSTACK_ENDPOINT:?Define LOCALSTACK_ENDPOINT}" \
    --region us-east-1 \
    --no-cli-pager \
    "$@"
}
```

### 21.2. Qué aporta

Las credenciales ficticias se declaran por invocación.
El token temporal se vacía.
El endpoint y la región se declaran explícitamente.
La función depende de los archivos locales preparados.

---

## 22. Definir una referencia explícita para awslocal

Mantendremos el destino visible aunque el envoltorio tenga valores predeterminados.

### 22.1. Función `awslocal_curso`

```bash
awslocal_curso() {
  AWS_ACCESS_KEY_ID=test \
  AWS_SECRET_ACCESS_KEY=test \
  AWS_SESSION_TOKEN= \
  AWS_EC2_METADATA_DISABLED=true \
  AWS_PAGER= \
  awslocal \
    --profile localstack \
    --endpoint-url "${LOCALSTACK_ENDPOINT:?Define LOCALSTACK_ENDPOINT}" \
    --region us-east-1 \
    "$@"
}
```

### 22.2. Comprobación necesaria

La modalidad de instalación debe admitir estas opciones.
El docente debe probar la función con la versión elegida.
No añadas `--no-cli-pager` suponiendo que toda instalación utiliza AWS CLI versión 2.
Registra cualquier adaptación necesaria.

---

## 23. Ejecutar la primera comparación

Ambos clientes deben consultar la misma instancia local.

### 23.1. Consultas equivalentes

```bash
aws_local s3api list-buckets
awslocal_curso s3api list-buckets
```

### 23.2. Qué observar

Compara:

- Nombres de recursos.
- Presencia de errores.
- Estructura de la respuesta.
- Formato.
- Tiempo aproximado de respuesta.

### 23.3. Interpretación

Una lista vacía es válida en un entorno limpio.
El orden de determinados elementos no debe considerarse una identidad garantizada.
Las diferencias de formato no demuestran destinos diferentes.
Las diferencias de recursos necesitan investigación.

---

## 24. Evitar consultas sin destino explícito

La comodidad puede ocultar una configuración incompleta.

### 24.1. Comando que no utilizaremos como referencia

```text
aws s3api list-buckets
```

### 24.2. Por qué resulta ambiguo

El destino dependerá de la configuración efectiva.
Las credenciales pueden proceder del entorno.
El perfil seleccionado puede no ser local.
La región puede heredarse.
No basta con estar dentro de la carpeta del curso.

### 24.3. Procedimiento correcto

Utiliza las funciones verificadas.
Antes de una operación sensible, comprueba el endpoint.
No interpretes una firma inválida como garantía de aislamiento.
Las credenciales ficticias no sustituyen los controles de red.

### 24.4. Ejercicio de análisis

Explica qué información falta en el comando ambiguo.
No lo ejecutes para descubrir su destino.

---

## 25. Crear el bucket de práctica

El recurso de CLI tendrá un nombre diferente del recurso Terraform.

### 25.1. Definir el nombre

```bash
export CLI_BUCKET="aula-cli-local-001"
```

### 25.2. Comprobar y crear

```bash
aws_local s3api list-buckets

aws_local s3api create-bucket \
  --bucket "$CLI_BUCKET"
```

### 25.3. Condiciones

La práctica utiliza `us-east-1`.
No copies este ejemplo a otras regiones suponiendo que la solicitud es idéntica.
Si el entorno es compartido, acuerda nombres diferentes.
No utilices nombres personales.

### 25.4. Segunda creación

No repitas automáticamente la creación ante cualquier error.
Investiga existencia, conectividad y respuesta de la API.

---

## 26. Verificar existencia y etiquetas

La existencia y las propiedades son comprobaciones diferentes.

### 26.1. Comprobar existencia

```bash
awslocal_curso s3api head-bucket \
  --bucket "$CLI_BUCKET"
```

### 26.2. Establecer etiquetas

```bash
aws_local s3api put-bucket-tagging \
  --bucket "$CLI_BUCKET" \
  --tagging '{"TagSet":[{"Key":"Curso","Value":"Terraform"},{"Key":"Entorno","Value":"LocalStack"}]}'
```

### 26.3. Consultar etiquetas

```bash
awslocal_curso s3api get-bucket-tagging \
  --bucket "$CLI_BUCKET"
```

### 26.4. Semántica

La operación de etiquetado establece el conjunto proporcionado.
No debe interpretarse como una adición aislada que conserva todas las etiquetas anteriores.
La consulta de existencia puede terminar sin mostrar contenido.

---

## 27. Crear un archivo ficticio

El ejercicio de objetos no necesita información real.

### 27.1. Preparar contenido

```bash
mkdir -p materiales descargas

printf 'Practica local de AWS CLI y awslocal.\n' \
  > materiales/mensaje.txt
```

### 27.2. Revisar antes de subir

```bash
cat materiales/mensaje.txt
```

### 27.3. Datos permitidos

Utiliza:

- Texto inventado.
- Identificadores sintéticos.
- Ejemplos sin información personal.
- Materiales autorizados.

### 27.4. Datos prohibidos

No subas contraseñas, documentos privados ni archivos de producción.
Un servicio local puede conservar información.
Local no significa automáticamente descartable ni seguro.

---

## 28. Subir y listar un objeto

La clave identifica el objeto dentro del bucket.

### 28.1. Subida mediante AWS CLI

```bash
aws_local s3api put-object \
  --bucket "$CLI_BUCKET" \
  --key practicas/mensaje.txt \
  --body materiales/mensaje.txt
```

### 28.2. Consulta mediante awslocal

```bash
awslocal_curso s3api list-objects-v2 \
  --bucket "$CLI_BUCKET"
```

### 28.3. Resultado esperado

Debe aparecer la clave `practicas/mensaje.txt`.
El tamaño debe ser coherente con el archivo.
La respuesta puede incluir otros atributos.
No presupongas valores idénticos entre versiones.

### 28.4. Matiz

Las barras de la clave no implican directorios tradicionales.
S3 almacena objetos identificados por claves.

---

## 29. Descargar y comparar contenido

La verificación debe comprobar el contenido, no solo la presencia de una clave.

### 29.1. Descargar mediante awslocal

```bash
awslocal_curso s3api get-object \
  --bucket "$CLI_BUCKET" \
  --key practicas/mensaje.txt \
  descargas/mensaje.txt
```

### 29.2. Comparar archivos

```bash
cmp materiales/mensaje.txt descargas/mensaje.txt
```

### 29.3. Interpretación

Si `cmp` termina correctamente, ambos archivos son iguales byte a byte.
Una descarga correcta no valida todos los atributos del objeto.
Tampoco demuestra durabilidad de AWS real.
Registra el alcance de la comprobación.

### 29.4. Precaución sobre ETag

No utilices el ETag como equivalente universal de un hash MD5.
Su significado depende de la operación y de características del almacenamiento.

---

## 30. Diferenciar `s3` y `s3api`

AWS CLI ofrece comandos con distintos niveles de abstracción.

### 30.1. Comandos de alto nivel

El grupo `s3` facilita operaciones habituales.
Por ejemplo:

```bash
aws_local s3 ls "s3://$CLI_BUCKET/"
```

### 30.2. Operaciones de API

El grupo `s3api` expone operaciones más próximas a la API.
Por ejemplo:

```bash
aws_local s3api list-objects-v2 \
  --bucket "$CLI_BUCKET"
```

### 30.3. Elección del curso

Utilizamos principalmente `s3api` para identificar operaciones concretas.
Los comandos de alto nivel pueden simplificar tareas.
Sin embargo, algunos implican varias solicitudes.
Su disponibilidad y comportamiento deben comprobarse en la combinación elegida.

---

## 31. Consultas y formatos de salida

Una respuesta estructurada facilita comprobaciones y registros.

### 31.1. Seleccionar nombres

```bash
aws_local s3api list-buckets \
  --query 'Buckets[].Name' \
  --output json
```

### 31.2. Seleccionar claves

```bash
awslocal_curso s3api list-objects-v2 \
  --bucket "$CLI_BUCKET" \
  --query 'Contents[].Key' \
  --output json
```

### 31.3. Interpretación

`--query` aplica una expresión JMESPath.
No cambia los recursos.
Una proyección vacía puede aparecer como `null` según la respuesta y la expresión.
No la interpretes automáticamente como un error.

### 31.4. Evidencia completa

Conserva la operación y la consulta utilizadas.
Un fragmento aislado puede perder contexto.

---

## 32. Paginación y listados incompletos

Los listados pueden abarcar varias páginas de resultados.

### 32.1. Concepto principal

Una API puede devolver resultados parciales y un indicador de continuación.
AWS CLI incorpora mecanismos de paginación para operaciones compatibles.
Las opciones del cliente y de la API no son siempre equivalentes.
No confundas tamaño de página con cantidad total de recursos.

### 32.2. Ejemplo de observación

```bash
aws_local s3api list-objects-v2 \
  --bucket "$CLI_BUCKET" \
  --max-keys 1 \
  --no-paginate
```

### 32.3. Qué revisar

Busca indicadores de truncamiento y continuación.
El ejercicio será más visible si existen varios objetos ficticios.
No concluyas que solo existe un objeto porque viste una página.

### 32.4. Aplicación práctica

Las herramientas de inventario y limpieza deben considerar la paginación.
Un listado parcial no constituye una verificación exhaustiva.

---

## 33. Códigos de salida y errores

La salida de texto y el resultado del proceso deben interpretarse juntos.

### 33.1. Consultar el código inmediato

```bash
aws_local s3api head-bucket --bucket "$CLI_BUCKET"
resultado=$?
printf 'Codigo de salida: %s\n' "$resultado"
```

### 33.2. Regla importante

`$?` corresponde al comando anterior.
Si ejecutas otra operación antes de guardarlo, pierdes esa referencia.
Una consulta puede terminar correctamente sin imprimir datos.
Una salida vacía no implica fallo.

### 33.3. Consulta fallida

Un error puede indicar:

- Recurso inexistente.
- Conectividad.
- Parámetros incorrectos.
- Permisos.
- Problemas del servicio.

### 33.4. Diagnóstico

No traduzcas cualquier error a recurso ausente.

---

## 34. Scripts y controles previos

Una automatización debe comprobar sus supuestos.

### 34.1. Comprobación mínima de endpoint

```bash
case "$LOCALSTACK_ENDPOINT" in
  http://localhost:*|http://127.0.0.1:*)
    printf 'Endpoint de bucle local reconocido.\n'
    ;;
  *)
    printf 'Endpoint no admitido para esta practica.\n' >&2
    ;;
esac
```

### 34.2. Límite de este ejemplo

La comprobación es orientativa.
No valida completamente una URL.
No verifica puertos, resolución, proxy ni redirecciones.
Un mensaje de rechazo debe impedir continuar en un script real.

### 34.3. Controles complementarios

Utiliza validación más estricta y controles de red cuando corresponda.
No conviertas una coincidencia de texto en una garantía universal de aislamiento.

---

## 35. Integración con Terraform

Terraform configurará sus credenciales y endpoints independientemente del perfil de CLI.

### 35.1. Archivo `versions.tf`

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

### 35.2. Separación fundamental

Configurar AWS CLI no configura automáticamente todos los detalles del provider.
Declararemos credenciales ficticias directamente en el ejemplo local.
El provider utilizará endpoints explícitos.
No se utilizará el bucket creado mediante CLI.

### 35.3. Política de versiones

El docente debe probar la serie elegida.
El archivo de bloqueo conservará la selección efectiva del provider.

---

## 36. Configurar el provider local

La conexión quedará separada de los archivos de AWS CLI.

### 36.1. Archivo `providers.tf`

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

### 36.2. Alcance

El ejemplo contempla S3 y STS.
Añadir servicios exige revisar endpoints.
Las opciones de omisión no bloquean tráfico externo por sí mismas.

---

## 37. Crear y verificar el recurso declarativo

El segundo bucket permitirá comprobar la relación entre herramientas.

### 37.1. Archivo `main.tf`

```hcl
resource "aws_s3_bucket" "verificacion" {
  bucket        = "aula-terraform-cli-001"
  force_destroy = false
}
```

### 37.2. Ejecución

```bash
terraform init
terraform fmt
terraform validate
terraform plan
terraform apply
```

### 37.3. Verificación externa

```bash
awslocal_curso s3api head-bucket \
  --bucket aula-terraform-cli-001

terraform state list
```

---

## 38. Propiedad y cambios externos

La herramienta utilizada para crear un recurso afecta a su seguimiento.

### 38.1. Bucket de CLI

El bucket `aula-cli-local-001` se creó mediante comandos.
No está registrado como recurso de esta configuración Terraform.
Su limpieza se realizará mediante CLI.
No aparecerá automáticamente en `terraform state list`.

### 38.2. Bucket de Terraform

El bucket `aula-terraform-cli-001` está gestionado por Terraform.
Lo consultaremos mediante CLI.
No lo eliminaremos manualmente durante el flujo principal.
Su limpieza se realizará mediante Terraform.

### 38.3. Drift

Cambiar externamente un atributo gestionado puede producir diferencias.
Un plan posterior puede detectar esas diferencias.
La detección depende del provider y de los atributos.
Consultar un recurso no produce drift por sí mismo.

---

## 39. Sesión práctica A: configurar y comparar clientes

La primera sesión trabaja rutas, perfiles y consultas equivalentes.

### 39.1. Duración y objetivo

Duración orientativa: 30 minutos, con herramientas instaladas.
Objetivo: demostrar que ambos clientes consultan la misma instancia.

### 39.2. Actividades

1. Identifica versiones y ejecutables.
2. Prepara los archivos locales.
3. Define el endpoint.
4. Define ambas funciones.
5. Ejecuta `list-buckets`.
6. Compara resultados.
7. Registra diferencias de implementación.

### 39.3. Entregable

Entrega una tabla de versiones y dos consultas.
Explica por qué un perfil local no garantiza por sí solo un destino local.
Incluye una limitación de la comparación.

---

## 40. Sesión práctica B: objetos y verificación cruzada

La segunda sesión alterna herramientas sin mezclar responsabilidades.

### 40.1. Duración y objetivo

Duración orientativa: 35 minutos.
Objetivo: comprobar un objeto creado y recuperado con clientes diferentes.

### 40.2. Actividades

Crea el bucket mediante AWS CLI.
Añade etiquetas.
Crea un archivo ficticio.
Sube el objeto mediante AWS CLI.
Lista y descarga mediante awslocal.
Compara los archivos.
Documenta el resultado.

### 40.3. Revisión por parejas

Una persona ejecuta.
La otra interpreta cada evidencia.
Después intercambian funciones.
No basta con mostrar que una descarga generó un archivo.

---

## 41. Sesión práctica C: verificar Terraform y diagnosticar

La tercera sesión combina seguimiento declarativo y consultas externas.

### 41.1. Duración y objetivo

Duración orientativa: 35 minutos.
Objetivo: distinguir recurso registrado, recurso observado y error de consulta.

### 41.2. Actividades

1. Crea el bucket Terraform.
2. Consulta su existencia con awslocal.
3. Consulta el estado.
4. Compara los dos buckets.
5. Analiza una consulta a un nombre ficticio inexistente.
6. Explica el error sin inventar causas.

### 41.3. Entregable

Entrega direcciones de Terraform y nombres de S3.
Añade una explicación de sus diferencias.
Incluye una comprobación adicional útil para diagnosticar conectividad.
No elimines recursos para producir errores arbitrarios.

---

## 42. Limpieza controlada del laboratorio

Cada recurso debe limpiarse con un alcance identificado.

### 42.1. Eliminar objeto y bucket de CLI

```bash
aws_local s3api delete-object \
  --bucket "$CLI_BUCKET" \
  --key practicas/mensaje.txt

awslocal_curso s3api list-objects-v2 \
  --bucket "$CLI_BUCKET"

aws_local s3api delete-bucket \
  --bucket "$CLI_BUCKET"
```

### 42.2. Eliminar el recurso Terraform

```bash
terraform plan -destroy
terraform destroy
```

### 42.3. Precaución

La limpieza del objeto presupone un bucket sin versionado.
No uses este procedimiento como eliminación completa de versiones.

---

## 43. Verificación final y protección de archivos

La limpieza debe comprobarse antes de retirar LocalStack.

### 43.1. Consultas finales

```bash
aws_local s3api list-buckets
terraform state list
docker compose down
```

### 43.2. Condiciones

No detengas una instancia compartida sin autorización.
Comprueba que los nombres del ejercicio ya no aparecen.
Otros recursos pueden pertenecer a otros equipos.
No los elimines.

### 43.3. Archivo `.gitignore`

```gitignore
.env
.aws-local/
.terraform/
*.tfstate
*.tfstate.*
*.tfplan
```

---

## 44. Diferencias respecto a AWS real y evaluación

La lección enseña procedimientos locales con límites explícitos.

### 44.1. Diferencias esenciales

LocalStack no es una cuenta de AWS.
Las credenciales ficticias no validan identidades reales.
Las pruebas no representan cuotas, costes ni disponibilidad de AWS.
La emulación de permisos puede diferir.
El comportamiento depende de versión y edición.

### 44.2. Rúbrica inicial

| **Criterio** | **0 puntos** | **1 punto** | **2 puntos** |
|-------------|--------------|-------------|-------------|
| Configuración | No operativa | Requiere ajustes | Perfil y destino verificados |
| Comparación | Sin evidencia | Parcial | Diferencias documentadas |
| Objetos | No completa | Verifica parcialmente | Recupera y compara contenido |
| Terraform | Confunde propiedad | Explicación parcial | Distingue estado y API |
| Seguridad | Incumple límites | Cumplimiento parcial | Respeta controles y limpieza |

La puntuación máxima es diez.
Un fallo crítico no queda compensado por una puntuación alta.
La exposición de secretos debe tratarse por separado.

---

## 45. Registro, resumen y siguientes pasos

La práctica termina cuando puedes explicar sus resultados y sus limitaciones.

### 45.1. Registro mínimo

Conserva fecha, versiones y rutas.
Anota perfil, endpoint y archivos utilizados.
Registra comandos y resultados saneados.
Distingue hechos observados de resultados esperados.
Incluye errores, hipótesis y comprobaciones.
Documenta la limpieza.

### 45.2. Ideas principales

AWS CLI es un cliente general.
awslocal facilita operaciones locales, pero requiere comprobar su configuración.
Un perfil no sustituye un endpoint.
Las credenciales ficticias no constituyen aislamiento completo.
Terraform conserva seguimiento independiente de las consultas CLI.
Los objetos y buckets necesitan ciclos de limpieza explícitos.

### 45.3. Cierre

**Configura el destino, verifica la operación y documenta su alcance.**
Estas prácticas serán la base para comprobar los recursos de las siguientes unidades.