# Instalación de Terraform, Docker y AWS CLI para laboratorios con LocalStack

> Curso de Terraform con LocalStack emulando servicios de AWS.
> Los ejercicios de esta lección se ejecutan localmente.
> No necesitas una cuenta de AWS para completar el laboratorio.
> Utiliza exclusivamente credenciales ficticias.
> No conectes esta práctica a infraestructura real.

Esta lección prepara el entorno técnico que utilizarás durante el curso.
Instalarás Terraform, Docker y AWS CLI siguiendo una ruta compatible con tu sistema operativo.
Después arrancarás LocalStack y comprobarás que las herramientas pueden trabajar juntas.

La instalación no termina cuando aparece un ejecutable.
También hay que verificar versiones, permisos, arquitectura, conectividad y resultados.
Por eso la unidad incluye comprobaciones individuales y un laboratorio integrado.

La documentación distingue tres rutas: Windows con WSL, macOS y Linux.
Debes seguir una sola ruta principal.
Mezclar instalaciones de distintos entornos suele producir errores difíciles de identificar.

---

## 1. Objetivos de aprendizaje

El resultado esperado es un entorno preparado, comprensible y verificable.

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Explicar la función de Terraform.
- Diferenciar Docker CLI y Docker Engine.
- Explicar para qué sirve Docker Compose.
- Diferenciar AWS CLI de una cuenta de AWS.
- Identificar el papel de LocalStack.
- Reconocer la arquitectura de tu equipo.

### 1.2. Objetivos prácticos

También podrás:

- Instalar las herramientas necesarias.
- Comprobar que sus ejecutables están disponibles.
- Arrancar un contenedor local.
- Consultar una API emulada.
- Inicializar un proyecto Terraform.
- Crear y eliminar un recurso de prueba.
- Registrar las versiones utilizadas.

### 1.3. Evidencias de aprendizaje

Conserva:

- Una tabla de versiones.
- Una descripción de tu ruta de instalación.
- Los archivos del laboratorio.
- Las comprobaciones relevantes.
- Un registro de errores y soluciones.
- La evidencia de limpieza final.

---

## 2. Alcance y límites de la lección

Esta unidad prepara un laboratorio educativo, no una plataforma de producción.

### 2.1. Qué instalaremos

Las herramientas principales son:

- Terraform CLI.
- Docker Engine o Docker Desktop.
- Docker Compose.
- AWS CLI versión 2.
- Utilidades auxiliares de terminal.
- LocalStack mediante una imagen de contenedor.

### 2.2. Qué no configuraremos

Quedan fuera de esta lección:

- Credenciales reales de AWS.
- Identidades IAM.
- Backends remotos de Terraform.
- Automatizaciones corporativas.
- Acceso remoto al motor de Docker.
- Publicación de servicios en Internet.

### 2.3. Condición importante

Las versiones y paquetes disponibles pueden cambiar.
Los comandos describen procedimientos habituales.
El docente debe comprobar la ruta elegida antes de impartir la sesión.
Esta página no afirma haber ejecutado las instalaciones en tu equipo.

---

## 3. Requisitos previos

Revisa estas condiciones antes de descargar software.

### 3.1. Conocimientos necesarios

Debes saber:

- Abrir una terminal.
- Crear directorios.
- Editar un archivo de texto.
- Ejecutar un comando.
- Leer un mensaje de error.
- Diferenciar una ruta de un nombre de archivo.

### 3.2. Recursos del equipo

Necesitas:

- Conexión a Internet para la preparación inicial.
- Espacio libre para herramientas e imágenes.
- Memoria suficiente para Docker y LocalStack.
- Permisos de instalación cuando correspondan.
- Virtualización disponible si utilizas Docker Desktop.
- Un editor de texto.

### 3.3. Equipos administrados

En un equipo corporativo o educativo, consulta las restricciones.
No desactives controles de seguridad para completar la práctica.
No instales software fuera del procedimiento autorizado.
Si faltan permisos, utiliza un entorno preparado por el centro.

---

## 4. Elegir una ruta de instalación

La ruta depende del sistema operativo y del lugar donde ejecutarás los comandos.

### 4.1. Opciones recomendadas

La tabla resume las alternativas utilizadas en esta documentación.

| **Sistema** | **Ruta principal** | **Terminal del curso** |
|-------------|--------------------|------------------------|
| Windows | WSL 2 y Docker Desktop | Bash dentro de WSL |
| macOS | Herramientas locales y Docker Desktop | Terminal |
| Ubuntu Linux | Herramientas locales y Docker Engine | Bash |

La ruta principal debe mantenerse durante toda la práctica.
No ejecutes unas herramientas en Windows y otras en WSL sin documentarlo.

### 4.2. Decisión previa

Anota:

- Sistema operativo.
- Arquitectura.
- Ruta elegida.
- Terminal utilizada.
- Método de instalación.
- Necesidad de permisos administrativos.

### 4.3. Regla del curso

Los ejemplos del laboratorio utilizan Bash.
Las instrucciones de preparación de Windows utilizan PowerShell cuando se indica.
No intercambies ambos lenguajes de comandos.

---

## 5. Identificar sistema y arquitectura

La arquitectura determina qué binarios puedes ejecutar.

### 5.1. En Linux, WSL o macOS

Ejecuta:

```bash
uname -s
uname -m
```

### 5.2. Interpretación habitual

Las correspondencias más comunes son:

- `x86_64`: arquitectura de 64 bits Intel o AMD.
- `aarch64`: arquitectura ARM de 64 bits en Linux.
- `arm64`: arquitectura ARM de 64 bits en macOS.

### 5.3. En PowerShell

Puedes consultar:

```powershell
$PSVersionTable
[System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture
```

### 5.4. Errores por arquitectura

Un binario incompatible puede mostrar errores de formato.
No lo soluciones añadiendo permisos de ejecución.
Comprueba primero que descargaste el paquete correcto.
La arquitectura del sistema y la del paquete deben ser compatibles.

---

## 6. Qué hace Terraform

Terraform CLI es la herramienta que interpreta tus configuraciones.

### 6.1. Responsabilidades principales

Terraform:

- Lee archivos HCL.
- Resuelve expresiones y dependencias.
- Utiliza providers.
- Genera planes.
- Ejecuta operaciones aprobadas.
- Mantiene información de seguimiento.

### 6.2. Qué no incluye por defecto

Instalar Terraform no instala automáticamente todos los providers.
Los providers se obtienen al inicializar un proyecto.
Terraform tampoco instala Docker.
No arranca LocalStack por el simple hecho de estar disponible.

### 6.3. Primera comprobación

Después de instalarlo, ejecutarás:

```bash
terraform version
```

### 6.4. Interpretación

La versión mostrada corresponde a Terraform CLI.
No es la versión del provider de AWS.
No es la versión de LocalStack.

---

## 7. Qué hace Docker

Docker permite ejecutar procesos aislados mediante contenedores.

### 7.1. Componentes principales

Debes distinguir:

- Docker CLI.
- Docker Engine.
- Imágenes.
- Contenedores.
- Redes.
- Volúmenes.

### 7.2. Cliente y motor

La CLI envía solicitudes al motor.
El motor crea y gestiona contenedores.
Puedes tener el cliente instalado y el motor detenido.
Por eso una comprobación de versión debe observar ambas partes.

### 7.3. Docker Desktop

Docker Desktop integra componentes para equipos de escritorio.
En macOS y Windows utiliza una infraestructura de virtualización.
Su instalación y uso deben respetar las condiciones de licencia aplicables.
El centro debe revisar esos requisitos antes de distribuirlo.

### 7.4. Docker Engine en Linux

En Linux puedes instalar el motor directamente.
No necesitas añadir Docker Desktop para esta ruta.
Evita mantener instalaciones duplicadas sin una razón clara.

---

## 8. Qué hace Docker Compose

Compose describe y gestiona grupos de servicios mediante un archivo.

### 8.1. Función en el curso

Utilizaremos Compose para:

- Declarar LocalStack.
- Configurar variables del contenedor.
- Publicar el puerto local.
- Arrancar el servicio.
- Consultar sus registros.
- Detenerlo al finalizar.

### 8.2. Comando utilizado

La documentación utiliza:

```bash
docker compose version
```

### 8.3. Diferencia de nombres

`docker compose` corresponde al plugin integrado en instalaciones actuales habituales.
`docker-compose` corresponde a otras modalidades de instalación.
No presupongas que ambos están disponibles.
Comprueba el comando realmente instalado.

### 8.4. Archivo del laboratorio

El archivo se llamará `compose.yaml`.
Su contenido no forma parte de la configuración HCL.
Compose y Terraform tienen responsabilidades diferentes.

---

## 9. Qué hace AWS CLI

AWS CLI permite ejecutar solicitudes contra APIs de servicios.

### 9.1. Función en esta unidad

La utilizaremos para:

- Consultar buckets.
- Comprobar su existencia.
- Leer etiquetas.
- Comparar resultados con Terraform.
- Verificar la limpieza.

### 9.2. No necesitas una cuenta real

AWS CLI puede dirigirse a un endpoint local.
En esta práctica usará credenciales ficticias.
No ejecutarás `aws configure` con claves personales.
No necesitas crear un perfil real de AWS.

### 9.3. Comprobación inicial

```bash
aws --version
```

### 9.4. Versión esperada

El curso utiliza AWS CLI versión 2.
Comprueba que la salida corresponde a esa serie.
No confundas AWS CLI con el provider de Terraform.

---

## 10. Qué hace LocalStack

LocalStack emula determinados servicios y comportamientos de AWS.

### 10.1. Función educativa

Permite practicar:

- Solicitudes contra APIs.
- Creación de recursos.
- Revisión de configuraciones.
- Comprobaciones locales.
- Procedimientos de limpieza.

### 10.2. Límites

La compatibilidad depende de:

- Servicio.
- Versión.
- Edición.
- Configuración.
- Funcionalidad utilizada.

### 10.3. Instalación elegida

No instalaremos una CLI adicional de LocalStack.
Ejecutaremos su imagen mediante Docker Compose.
Esto reduce el número de dependencias del laboratorio.
La imagen se descargará al iniciar el servicio por primera vez.

### 10.4. Verificación necesaria

El docente debe comprobar la disponibilidad de S3 en la imagen elegida.
También debe revisar sus requisitos de autenticación y licencia.

---

## 11. Política de versiones del curso

Una instalación reproducible necesita decisiones explícitas.

### 11.1. Registro obligatorio

Documenta:

- Versión de Terraform CLI.
- Versión de Docker.
- Versión de Compose.
- Versión de AWS CLI.
- Imagen de LocalStack.
- Versión seleccionada del provider.

### 11.2. Referencias del ejemplo

La configuración Terraform utilizará:

- Terraform desde 1.6 y anterior a 2.0.
- Provider de AWS dentro de la serie 5.

La imagen de LocalStack se seleccionará mediante una variable.
El docente debe indicar su etiqueta probada.
No se utilizará `latest` como referencia de reproducibilidad.

### 11.3. Actualizaciones

Actualizar no equivale a mejorar automáticamente la práctica.
Una actualización puede cambiar errores y comportamientos.
Realízala de forma deliberada.
Después repite las comprobaciones relevantes.

---

## 12. Seguridad antes de instalar

Instalar herramientas implica modificar el equipo.

### 12.1. Fuentes de software

Utiliza:

- Distribuidores oficiales.
- Repositorios del fabricante.
- Gestores de paquetes autorizados.
- Paquetes aprobados por tu organización.

### 12.2. Comprobación de descargas

Cuando el procedimiento lo permita:

- Comprueba la arquitectura.
- Comprueba la versión.
- Verifica sumas de comprobación.
- Verifica firmas.
- Conserva el origen de la descarga.

### 12.3. Uso de privilegios

No añadas `sudo` indiscriminadamente.
No ejecutes Terraform con permisos de administrador para evitar errores de archivos.
Los privilegios deben corresponder a una necesidad concreta.
Instalar y ejecutar un laboratorio son operaciones distintas.

### 12.4. Scripts remotos

No ejecutes scripts descargados sin revisión.
Las instrucciones de esta lección no necesitan un instalador remoto ejecutado mediante una tubería a la shell.

---

## 13. Windows: preparar WSL 2

Esta ruta utiliza Linux dentro de Windows para ejecutar los ejemplos Bash.

### 13.1. Comprobación inicial

Abre PowerShell y consulta:

```powershell
wsl --status
wsl --list --verbose
```

### 13.2. Instalación de WSL

Si no está instalado y tu equipo lo permite, abre PowerShell con privilegios administrativos:

```powershell
wsl --install -d Ubuntu
```

### 13.3. Finalizar la preparación

El proceso puede solicitar un reinicio.
Después inicia Ubuntu.
Crea el usuario Linux cuando se solicite.
La contraseña puede no mostrar caracteres al escribirla.
Eso es normal en una terminal Linux.

### 13.4. Verificación

Vuelve a consultar:

```powershell
wsl --list --verbose
```

Comprueba que la distribución utiliza WSL 2.

---

## 14. Windows: instalar Docker Desktop

Docker Desktop proporcionará el motor utilizado desde WSL.

### 14.1. Preparación

Comprueba:

- Compatibilidad del sistema.
- Disponibilidad de virtualización.
- Permisos de instalación.
- Condiciones de licencia.
- Política del centro.

### 14.2. Instalación

Utiliza el instalador oficial aprobado.
Durante la configuración, selecciona el backend WSL 2 cuando corresponda.
Inicia Docker Desktop.
Espera a que el motor esté disponible.

### 14.3. Integración con Ubuntu

En la configuración de Docker Desktop:

- Activa la integración con WSL.
- Selecciona la distribución Ubuntu del curso.
- Aplica los cambios.
- Reinicia la terminal si es necesario.

### 14.4. Verificación desde Ubuntu

```bash
docker version
docker compose version
```

No instales un segundo Docker Engine dentro de WSL para esta ruta.

---

## 15. Windows: trabajar dentro de WSL

Las herramientas del laboratorio se instalarán dentro de Ubuntu.

### 15.1. Preparar paquetes auxiliares

En la terminal de Ubuntu:

```bash
sudo apt-get update
sudo apt-get install -y \
  ca-certificates \
  curl \
  gnupg \
  unzip \
  file
```

### 15.2. Directorio recomendado

Trabaja dentro del sistema de archivos Linux:

```bash
mkdir -p ~/cursos/terraform
cd ~/cursos/terraform
```

### 15.3. Evitar mezclas

No alternes entre `terraform.exe` y Terraform Linux.
No utilices una AWS CLI de Windows sin documentar esa decisión.
No asumas que las variables de PowerShell existen dentro de Bash.
Cada entorno mantiene sus propias rutas y procesos.

### 15.4. Continuación

Para Terraform, sigue la sección de Ubuntu.
Para AWS CLI, sigue la sección de Linux.
Docker ya se proporciona mediante Docker Desktop.

---

## 16. macOS: preparar el entorno

Esta ruta ejecuta las herramientas desde la terminal del sistema.

### 16.1. Comprobar arquitectura

```bash
uname -m
```

### 16.2. Herramientas de desarrollo

Algunos métodos de instalación necesitan las herramientas de línea de comandos de Apple:

```bash
xcode-select --install
```

### 16.3. Gestor de paquetes

Los ejemplos de esta ruta utilizan Homebrew.
Instálalo únicamente mediante el procedimiento oficial autorizado.
Si ya está disponible, comprueba:

```bash
brew --version
```

### 16.4. Precaución

No instales una segunda copia de Homebrew por un error de `PATH`.
Comprueba primero dónde está instalado.
En equipos Apple Silicon, las rutas habituales difieren de las de equipos Intel.

### 16.5. Decisión del curso

También pueden utilizarse instaladores oficiales.
El método elegido debe quedar registrado.

---

## 17. macOS: instalar Terraform y AWS CLI

Homebrew simplifica la instalación si está autorizado.

### 17.1. Terraform

Ejecuta:

```bash
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
```

### 17.2. AWS CLI

Ejecuta:

```bash
brew install awscli
```

### 17.3. Verificar ejecutables

```bash
command -v terraform
command -v aws
terraform version
aws --version
```

### 17.4. Versiones del curso

El gestor puede instalar versiones diferentes de las probadas por el docente.
Compara la salida con la política del curso.
Si necesitas una versión concreta, utiliza el procedimiento aprobado para fijarla.
No modifiques restricciones de Terraform para ocultar una incompatibilidad.

### 17.5. Duplicados

No combines Homebrew e instaladores manuales sin revisar `PATH`.
Una instalación anterior puede seguir teniendo prioridad.

---

## 18. macOS: instalar y arrancar Docker Desktop

Docker Desktop ejecutará los contenedores del laboratorio.

### 18.1. Instalación

Descarga el instalador correspondiente a tu arquitectura.
Comprueba si el equipo utiliza Intel o Apple Silicon.
Sigue el procedimiento oficial autorizado.
Inicia la aplicación después de instalarla.

### 18.2. Primera ejecución

La aplicación puede solicitar permisos.
Lee cada solicitud.
Acepta únicamente lo necesario y autorizado.
Espera a que el motor termine de arrancar.

### 18.3. Comprobaciones

```bash
docker version
docker compose version
docker info
```

### 18.4. Interpretación

La salida de `docker version` debe incluir cliente y servidor.
Si solo aparece el cliente, revisa si Docker Desktop está iniciado.
No cambies permisos de archivos del sistema como respuesta automática.

---

## 19. Ubuntu: instalar Terraform

Esta ruta utiliza el repositorio de paquetes de HashiCorp.

### 19.1. Preparar dependencias

```bash
sudo apt-get update
sudo apt-get install -y \
  ca-certificates \
  curl \
  gnupg
```

### 19.2. Incorporar la clave del repositorio

```bash
curl -fsSL https://apt.releases.hashicorp.com/gpg \
  | sudo gpg --dearmor --yes \
    -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
```

### 19.3. Incorporar el repositorio

```bash
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(. /etc/os-release && echo "$VERSION_CODENAME") main" \
  | sudo tee /etc/apt/sources.list.d/hashicorp.list
```

### 19.4. Instalar y comprobar

```bash
sudo apt-get update
sudo apt-get install -y terraform
terraform version
```

La distribución y arquitectura deben estar admitidas por el repositorio.

---

## 20. Ubuntu: preparar Docker Engine

Esta sección corresponde a Linux nativo, no a la ruta WSL con Docker Desktop.

### 20.1. Revisar instalaciones existentes

Comprueba:

```bash
command -v docker
docker version
```

Si ya existe una instalación funcional, no la sustituyas automáticamente.
El docente debe decidir si cumple las condiciones del curso.
Los paquetes de Docker de distintas fuentes pueden entrar en conflicto.

### 20.2. Preparar el repositorio oficial

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings

sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc

sudo chmod a+r /etc/apt/keyrings/docker.asc
```

### 20.3. Precaución

Estos comandos corresponden a Ubuntu.
No los reutilices en Debian cambiando nombres sin revisar el procedimiento.
No elimines paquetes existentes sin comprobar su uso.

---

## 21. Ubuntu: instalar Docker Engine y Compose

Completa la configuración del repositorio antes de instalar.

### 21.1. Añadir el repositorio

```bash
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

### 21.2. Instalar paquetes

```bash
sudo apt-get update

sudo apt-get install -y \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin
```

### 21.3. Arrancar y consultar

```bash
sudo systemctl enable --now docker
sudo docker version
sudo docker compose version
```

### 21.4. Condición

`systemctl` requiere un sistema compatible con systemd.
Esta sección no debe aplicarse a WSL con Docker Desktop.

---

## 22. Linux: permisos de acceso a Docker

El acceso al motor requiere una decisión de seguridad.

### 22.1. Uso mediante `sudo`

Puedes comprobar inicialmente:

```bash
sudo docker info
```

### 22.2. Grupo `docker`

En algunos entornos se autoriza añadir el usuario al grupo:

```bash
sudo usermod -aG docker "$USER"
```

Después cierra la sesión e inicia otra.
La terminal actual puede conservar los grupos anteriores.

### 22.3. Advertencia importante

El grupo `docker` proporciona capacidades equivalentes a privilegios elevados.
No es un grupo inocuo.
Su uso debe estar autorizado en equipos compartidos.
No lo añadas como solución automática a cualquier error.

### 22.4. Qué no hacer

No cambies el socket de Docker a permisos universales.
No utilices `chmod 666` para evitar investigar el acceso.
No ejecutes todo el proyecto Terraform con `sudo`.

---

## 23. Linux y WSL: instalar AWS CLI versión 2

El instalador debe corresponder a la arquitectura del sistema.

### 23.1. Preparar utilidades

```bash
sudo apt-get update
sudo apt-get install -y curl unzip
```

### 23.2. Seleccionar el paquete

```bash
case "$(uname -m)" in
  x86_64)
    AWSCLI_ARCH="x86_64"
    ;;
  aarch64|arm64)
    AWSCLI_ARCH="aarch64"
    ;;
  *)
    printf 'Arquitectura no contemplada en este ejemplo.\n'
    ;;
esac
```

### 23.3. Descargar y extraer

Solo continúa si `AWSCLI_ARCH` tiene un valor correcto:

```bash
curl -fsSLo awscliv2.zip \
  "https://awscli.amazonaws.com/awscli-exe-linux-${AWSCLI_ARCH}.zip"

unzip awscliv2.zip
```

### 23.4. Verificación previa

Verifica la firma siguiendo el procedimiento oficial antes de instalar.
La descarga por HTTPS no sustituye esa comprobación.

---

## 24. Linux y WSL: finalizar la instalación de AWS CLI

Instala únicamente después de comprobar el origen del paquete.

### 24.1. Primera instalación

Desde el directorio donde extrajiste el archivo:

```bash
sudo ./aws/install
```

### 24.2. Instalación existente

Si ya utilizas el instalador oficial y necesitas actualizar:

```bash
sudo ./aws/install --update
```

### 24.3. Verificar

```bash
command -v aws
aws --version
```

### 24.4. No mezclar métodos

Si AWS CLI procede de otro gestor, no actualices con este instalador sin revisión.
Puede quedar una copia anterior con prioridad.
Comprueba todas las ubicaciones antes de borrar nada.

### 24.5. Archivos descargados

Puedes eliminar el ZIP y la carpeta del instalador cuando termines.
Hazlo desde el directorio correcto.
No utilices comodines amplios sobre carpetas ajenas al ejercicio.

---

## 25. Comprobar `PATH` y ejecutables duplicados

La terminal necesita localizar cada programa.

### 25.1. Consultas básicas

En Bash:

```bash
command -v terraform
command -v docker
command -v aws

type -a terraform
type -a docker
type -a aws
```

### 25.2. Interpretación

`command -v` muestra la selección habitual.
`type -a` puede mostrar varias coincidencias.
Una copia antigua puede ocultar una instalación nueva.
El orden de `PATH` determina qué ejecutable se utiliza.

### 25.3. Después de instalar

Abre una terminal nueva.
Algunas sesiones conservan información de rutas.
En Bash también puedes limpiar la caché de comandos:

```bash
hash -r
```

### 25.4. Regla

No borres ejecutables hasta identificar su método de instalación.
Utiliza el gestor correspondiente para desinstalar.

---

## 26. Verificación individual de las herramientas

Antes de integrar componentes, compruébalos por separado.

### 26.1. Terraform y AWS CLI

```bash
terraform version
aws --version
```

### 26.2. Docker y Compose

```bash
docker version
docker compose version
docker info
```

### 26.3. Prueba opcional de Docker

Si está autorizada la descarga de imágenes:

```bash
docker run --rm hello-world
```

### 26.4. Interpretación

La prueba descarga una imagen si no está presente.
El contenedor se elimina al terminar.
La imagen puede permanecer almacenada.
Esta prueba no comprueba todavía LocalStack.

### 26.5. Criterio de avance

No continúes si Docker no puede comunicarse con el servidor.
Tampoco continúes si Terraform o AWS CLI no se localizan.

---

## 27. Crear la carpeta del laboratorio integrado

La prueba final necesita un proyecto limpio.

### 27.1. Crear directorios

```bash
mkdir -p ~/cursos/terraform/instalacion-localstack/evidencias
cd ~/cursos/terraform/instalacion-localstack
```

### 27.2. Estructura prevista

```text
instalacion-localstack/
├── compose.yaml
├── .env
├── .env.example
├── versions.tf
├── providers.tf
├── main.tf
├── outputs.tf
├── .gitignore
└── evidencias/
    └── registro.md
```

### 27.3. Regla de separación

No utilices una carpeta de otro laboratorio.
Terraform lee conjuntamente los archivos `.tf`.
Un archivo olvidado puede añadir recursos inesperados.
Revisa el contenido antes de generar el primer plan.

---

## 28. Seleccionar la imagen de LocalStack

La imagen debe quedar identificada de forma explícita.

### 28.1. Archivo `.env.example`

Incluye:

```dotenv
LOCALSTACK_IMAGE=localstack/localstack:ETIQUETA_PROBADA_POR_EL_CURSO
```

### 28.2. Archivo local `.env`

Copia el ejemplo:

```bash
cp .env.example .env
```

Después sustituye el marcador por la etiqueta indicada por el docente.
No ejecutes Compose dejando el marcador.
No cambies automáticamente a `latest`.

### 28.3. Qué registrar

Anota:

- Repositorio de la imagen.
- Etiqueta.
- Edición.
- Requisitos de autenticación.
- Fecha de comprobación docente.

### 28.4. Secretos

Si la edición requiere un token, utiliza un mecanismo autorizado.
No lo incluyas en un archivo de ejemplo ni en Git.

---

## 29. Archivo Compose para LocalStack

El laboratorio publica únicamente el puerto local necesario.

### 29.1. Archivo `compose.yaml`

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

### 29.2. Decisiones del ejemplo

No se monta el socket de Docker.
No se configura persistencia explícita.
No se publican puertos en todas las interfaces.
No se añaden servicios ajenos a la prueba.

### 29.3. Validar la configuración

```bash
docker compose config
```

### 29.4. Precaución

La salida puede incluir variables sustituidas.
No la publiques sin revisión si añadiste secretos.
Una configuración válida no demuestra que la imagen exista.

---

## 30. Arrancar y observar LocalStack

La disponibilidad debe comprobarse después del arranque.

### 30.1. Descargar y arrancar

```bash
docker compose pull
docker compose up -d
```

### 30.2. Consultar el servicio

```bash
docker compose ps
docker compose logs --tail=100 localstack
```

### 30.3. Consulta de salud auxiliar

Si `curl` está disponible:

```bash
curl --fail --silent --show-error \
  http://localhost:4566/_localstack/health
```

### 30.4. Interpretación

La estructura de la respuesta depende de la versión.
Algunos servicios pueden inicializarse al recibir solicitudes.
No exijas una salida idéntica para todas las imágenes.
La siguiente consulta funcional a S3 será la comprobación principal.

---

## 31. Configurar AWS CLI para solicitudes locales

No modificaremos el archivo de credenciales del usuario.

### 31.1. Función de Bash

Define:

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

### 31.2. Primera consulta funcional

```bash
aws_local s3api list-buckets
```

### 31.3. Interpretación

La función utiliza credenciales ficticias y un endpoint explícito.
Debe volver a definirse en una terminal nueva.
No constituye por sí sola un aislamiento general de red.

---

## 32. Configurar Terraform para la prueba

La configuración utiliza únicamente un recurso S3.

### 32.1. Archivo `versions.tf`

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

### 32.2. Archivo `providers.tf`

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

### 32.3. Límite de conexión

Añadir otros servicios exige revisar sus endpoints.
Las opciones `skip_*` no son un cortafuegos.

---

## 33. Declarar el recurso y las salidas

El bucket servirá como prueba de integración.

### 33.1. Archivo `main.tf`

```hcl
resource "aws_s3_bucket" "instalacion" {
  bucket        = "tf-instalacion-local-001"
  force_destroy = false

  tags = {
    Curso   = "Terraform"
    Entorno = "LocalStack"
    Prueba  = "Instalacion"
  }
}
```

### 33.2. Archivo `outputs.tf`

```hcl
output "bucket_name" {
  description = "Bucket creado para comprobar la instalación."
  value       = aws_s3_bucket.instalacion.bucket
}
```

### 33.3. Nombre del recurso

En una instancia compartida, acuerda un nombre distinto por equipo.
No utilices nombres personales.
Mantén el bucket vacío durante la prueba.
No copies este recurso a un proyecto real sin revisión.

---

## 34. Proteger archivos locales del proyecto

El control de versiones debe conservar configuración, no secretos.

### 34.1. Archivo `.gitignore`

```gitignore
.env
.terraform/
*.tfstate
*.tfstate.*
*.tfplan
*.tfvars
*.tfvars.json
crash.log
crash.*.log
```

### 34.2. Archivos que puedes conservar

Normalmente se conservan:

- Archivos `.tf`.
- `compose.yaml`.
- `.env.example` sin secretos.
- `.terraform.lock.hcl`.
- Documentación saneada.

### 34.3. Precauciones

El estado puede contener información sensible.
Los planes también pueden contenerla.
`.gitignore` no elimina archivos ya registrados.
No adjuntes estados reales a asistentes externos para pedir ayuda.

---

## 35. Ejecutar la prueba integrada

Ahora comprobaremos el recorrido completo desde HCL hasta la API local.

### 35.1. Inicialización y validación

```bash
terraform init
terraform fmt
terraform validate
```

### 35.2. Revisar el plan

```bash
terraform plan
```

Comprueba que solo aparece el bucket de instalación.
Si aparecen otros recursos, detente.
Revisa todos los archivos y el estado del directorio.

### 35.3. Aplicar

```bash
terraform apply
```

Lee la propuesta antes de confirmar.
No utilices `-auto-approve`.

### 35.4. Qué demuestra

Una aplicación correcta comprueba una parte de la integración.
Todavía debes consultar el recurso de forma independiente.

---

## 36. Verificar el resultado del laboratorio

Las comprobaciones deben responder preguntas diferentes.

### 36.1. Consultar Terraform

```bash
terraform output
terraform state list
```

### 36.2. Consultar S3

```bash
aws_local s3api list-buckets

aws_local s3api head-bucket \
  --bucket tf-instalacion-local-001

aws_local s3api get-bucket-tagging \
  --bucket tf-instalacion-local-001
```

### 36.3. Resultado esperado

El nombre debe aparecer en el listado.
La consulta de existencia debe finalizar correctamente.
Las etiquetas deben coincidir con la declaración.
`head-bucket` puede no mostrar contenido en caso de éxito.

### 36.4. Comprobar convergencia

```bash
terraform plan
```

Se espera que no proponga nuevos cambios si el entorno no se ha modificado.

---

## 37. Diagnóstico de problemas de instalación

Diferencia errores de instalación y errores del laboratorio.

### 37.1. Tabla de síntomas

La tabla orienta la siguiente comprobación.

| **Síntoma** | **Comprobación inicial** | **Qué evitar** |
|-------------|--------------------------|----------------|
| Comando no encontrado | `PATH` y método de instalación | Reinstalar sin revisar |
| Docker sin servidor | Arranque del motor | Cambiar permisos globales |
| Error de formato | Arquitectura del binario | Añadir `sudo` |
| Puerto ocupado | Procesos y contenedores | Detener servicios ajenos |
| Provider no descargado | Red y repositorio | Cambiar a AWS real |
| S3 no responde | Registros y endpoint | Usar credenciales reales |

Cada síntoma admite varias causas.
La tabla no confirma un diagnóstico.

### 37.2. Procedimiento mínimo

Copia el mensaje sin secretos.
Identifica el comando que falló.
Formula una hipótesis.
Realiza una comprobación.
Cambia una condición relevante.
Repite y registra el resultado.

---

## 38. Problemas de red, proxy y certificados

La preparación necesita acceso a varias fuentes externas.

### 38.1. Operaciones que requieren red

Pueden necesitar conexión:

- Descarga de paquetes.
- Descarga de imágenes.
- Instalación de providers.
- Verificación de firmas.
- Consulta de repositorios.

### 38.2. Entornos con proxy

Utiliza la configuración indicada por la organización.
Docker, gestores de paquetes y terminal pueden necesitar ajustes distintos.
No asumas que configurar el navegador configura todas las herramientas.
No introduzcas contraseñas de proxy en documentación compartida.

### 38.3. Certificados

Un error de certificado puede indicar una configuración incompleta.
No desactives la validación TLS como solución permanente.
Solicita el procedimiento autorizado para certificados corporativos.

### 38.4. Trabajo sin conexión

El docente puede preparar cachés e imágenes previamente.
Debe documentar qué componentes están disponibles.
La instalación inicial no debe suponerse totalmente offline.

---

## 39. Sesiones prácticas para el alumnado

Las sesiones separan instalación, integración y explicación.

### 39.1. Sesión A: preparar herramientas

Duración orientativa: 45 a 90 minutos.
El tiempo depende de descargas, permisos y reinicios.

Actividades:

1. Identifica sistema y arquitectura.
2. Selecciona una ruta.
3. Instala las herramientas.
4. Comprueba versiones.
5. Registra problemas.

Entrega una tabla de versiones y tu ruta elegida.

### 39.2. Sesión B: comprobar integración

Duración orientativa: 35 minutos.

Arranca LocalStack y consulta S3.
Ejecuta la prueba Terraform.
Verifica el bucket desde AWS CLI.
Explica qué demuestra cada consulta.

### 39.3. Sesión C: revisión por parejas

Duración orientativa: 20 minutos.
Intercambia el registro con otra persona.
Localiza datos ausentes, supuestos y comprobaciones incompletas.

---

## 40. Ejercicios de refuerzo

Los ejercicios deben resolverse con explicaciones y evidencias.

### 40.1. Identificación de componentes

Explica qué componente:

- Interpreta HCL.
- Descarga una imagen.
- Ejecuta un contenedor.
- Envía una consulta S3.
- Emula la API.
- Conserva el estado.

### 40.2. Casos de diagnóstico

Analiza estos casos:

- `docker version` muestra cliente, pero no servidor.
- AWS CLI funciona, pero Terraform no aparece en `PATH`.
- LocalStack arranca, pero el puerto ya estaba ocupado.
- La inicialización funciona, pero la aplicación no conecta.
- WSL encuentra un ejecutable de Windows inesperado.

### 40.3. Ejercicio de documentación

Escribe una guía de preparación de diez pasos para tu sistema.
Incluye comprobaciones después de cada bloque importante.
No incluyas secretos ni instrucciones para desactivar controles.

---

## 41. Limpieza y diferencias respecto a AWS real

La limpieza forma parte de la validación del entorno.

### 41.1. Eliminar el recurso de prueba

```bash
terraform plan -destroy
terraform destroy
```

Revisa que solo se elimine el bucket del laboratorio.

### 41.2. Verificar y detener

```bash
terraform state list
aws_local s3api list-buckets
docker compose down
```

No detengas una instancia compartida sin autorización.
No borres el estado para ocultar una limpieza fallida.

### 41.3. Qué conservar

Conserva las herramientas para las siguientes unidades.
Conserva la configuración y el registro saneado.
Eliminar recursos no significa desinstalar Docker o Terraform.

### 41.4. Diferencias esenciales

LocalStack no reproduce necesariamente permisos, cuotas ni rendimiento de AWS.
Las credenciales ficticias no sirven para AWS real.
Una prueba local no valida costes, disponibilidad o seguridad productiva.

---

## 42. Evaluación, resumen y cierre

El entorno está preparado cuando puedes demostrar que sus componentes funcionan juntos.

### 42.1. Lista de comprobación

Marca cada evidencia:

- Identifiqué sistema y arquitectura.
- Seguí una ruta coherente.
- Terraform está disponible.
- Docker puede comunicarse con su servidor.
- Compose está disponible.
- AWS CLI corresponde a la versión requerida.
- LocalStack responde a consultas S3.
- Terraform creó el recurso de prueba.
- Verifiqué el resultado independientemente.
- Eliminé el recurso y documenté la limpieza.

### 42.2. Criterios de evaluación

La evaluación considera funcionamiento, explicación y seguridad.
Copiar comandos sin comprenderlos no demuestra dominio.
Una instalación funcional con secretos expuestos no es satisfactoria.

### 42.3. Ideas principales

**Instalar, comprobar y documentar son partes del mismo trabajo.**
Mantén separadas las rutas de sistema y los contextos de ejecución.
Utiliza credenciales ficticias y endpoints locales.
La siguiente unidad partirá de este entorno verificado para desarrollar configuraciones Terraform.