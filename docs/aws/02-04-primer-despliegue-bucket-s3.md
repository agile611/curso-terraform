# Primer despliegue: un bucket S3 con Terraform y LocalStack

> Curso de Terraform con LocalStack emulando servicios de AWS.
> Todas las prácticas de esta lección se ejecutan localmente.
> No necesitas una cuenta de AWS para completar el laboratorio.
> Utiliza exclusivamente credenciales ficticias y endpoints locales.
> Una prueba satisfactoria en LocalStack no equivale a validar AWS real.

Tu primer despliegue servirá para comprender el ciclo completo de Terraform.
Crearás un bucket S3, comprobarás sus propiedades y probarás operaciones con un objeto.
Después modificarás una etiqueta, revisarás la convergencia y eliminarás los recursos.

El objetivo no es memorizar una secuencia de comandos.
El objetivo es relacionar **configuración, plan, estado y API**.
Cada herramienta aporta evidencias distintas sobre el mismo laboratorio.

Terraform gestionará el bucket.
AWS CLI realizará consultas y una prueba de contenido.
LocalStack proporcionará la API local utilizada por ambos clientes.

La documentación incluye un laboratorio principal y ampliaciones opcionales.
Las ampliaciones deben realizarse antes de la limpieza final.
No ejecutes varias configuraciones alternativas simultáneamente.

---

## 1. Objetivos de aprendizaje

Esta unidad convierte la configuración del provider en un despliegue verificable.

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Explicar qué representa un bucket S3.
- Diferenciar un bucket y un objeto.
- Relacionar configuración, plan y estado.
- Interpretar creación, actualización y destrucción.
- Distinguir resultados observados y resultados esperados.

### 1.2. Objetivos prácticos

También podrás:

- Crear un bucket mediante Terraform.
- Verificarlo mediante AWS CLI.
- Subir y recuperar contenido ficticio.
- Modificar una etiqueta sin cambiar el nombre.
- Limpiar el laboratorio con un alcance explícito.

---

## 2. Alcance del primer despliegue

El laboratorio mantiene un alcance pequeño para facilitar la interpretación.

### 2.1. Recursos principales

Crearemos:

- Un bucket S3 gestionado por Terraform.
- Un archivo ficticio en el anfitrión.
- Un objeto S3 creado mediante AWS CLI.

El objeto de CLI se eliminará antes de destruir el bucket.
Una ampliación permitirá gestionar otro objeto mediante Terraform.

### 2.2. Lo que no configuraremos

No añadiremos:

- Identidades reales de AWS.
- Políticas IAM de producción.
- Replicación.
- Notificaciones.
- Sitios web públicos.
- Versionado en el laboratorio principal.

### 2.3. Regla de alcance

No interpretes una prueba de contenido como validación completa de S3.

---

## 3. Requisitos previos

Comprueba las herramientas antes de crear recursos.

### 3.1. Conocimientos necesarios

Debes saber:

- Abrir una terminal Bash.
- Crear y editar archivos.
- Ejecutar Docker Compose.
- Identificar un endpoint local.
- Leer un bloque HCL sencillo.
- Distinguir recursos y archivos.

### 3.2. Comprobaciones iniciales

```bash
terraform version
docker version
docker compose version
aws --version
```

### 3.3. Criterio de avance

Docker debe mostrar un servidor disponible.
AWS CLI debe corresponder a la versión 2 para los comandos de esta página.
Resuelve instalación y permisos antes de continuar.

---

## 4. Versiones y compatibilidad

El resultado depende de la combinación de herramientas utilizada.

### 4.1. Base didáctica

Utilizaremos:

- Terraform desde 1.6 y anterior a 2.0.
- Provider de AWS dentro de la serie 5.
- Una imagen de LocalStack seleccionada por el docente.

Estas restricciones no representan una lista de versiones más recientes.
El docente debe probar la combinación antes de impartir la sesión.

### 4.2. Registro del entorno

Conserva:

- Versión de Terraform CLI.
- Versión efectiva del provider.
- Imagen y modalidad de LocalStack.
- Docker y Docker Compose.
- AWS CLI.
- Sistema y arquitectura.

### 4.3. Evidencia honesta

Esta página describe un procedimiento; no afirma haberlo ejecutado en tu equipo.

---

## 5. Qué es un bucket S3

Un bucket es un contenedor lógico de objetos.

### 5.1. Propiedades básicas

Un bucket tiene un nombre.
Puede tener etiquetas y otras configuraciones.
Contiene objetos identificados mediante claves.
No es una carpeta tradicional del sistema de archivos.

### 5.2. Nombre del laboratorio

Utilizaremos inicialmente:

```text
aula-primer-bucket-001
```

En una instancia compartida, el docente debe asignar nombres diferentes.
No utilices nombres personales ni nombres de clientes reales.

### 5.3. Particularidad de AWS real

Los nombres de buckets tienen reglas y restricciones de unicidad propias.
No extrapoles la aceptación local a disponibilidad de ese nombre en AWS.
Consulta las reglas del servicio antes de un despliegue real.

---

## 6. Qué es un objeto S3

Un objeto combina contenido con una clave y metadatos asociados.

### 6.1. Ejemplo del laboratorio

La clave será:

```text
practicas/mensaje-cli.txt
```

El contenido procederá de un archivo ficticio.
Las barras de la clave no crean directorios tradicionales.

### 6.2. Bucket y objeto

La dirección de un objeto incluye el bucket y su clave.
Crear un bucket no crea automáticamente objetos.
Eliminar un archivo local no elimina su copia en S3.

### 6.3. Propiedad de gestión

Un objeto creado mediante CLI no aparece automáticamente en el estado.
Terraform solo gestiona los recursos vinculados a su configuración y estado.
Esta diferencia será importante durante la limpieza.

---

## 7. Arquitectura del laboratorio

Los clientes se ejecutarán en el equipo anfitrión.

### 7.1. Recorrido de las solicitudes

```text
Equipo anfitrión
├── Terraform ── Provider AWS ──┐
├── AWS CLI ───────────────────┤
└── Docker                     │
    └── LocalStack ◀───────────┘
          │
          └── S3 local
```

### 7.2. Destino principal

El endpoint será `http://localhost:4566`.
Docker publicará ese puerto únicamente en la interfaz de bucle local.
Terraform y AWS CLI deberán utilizarlo explícitamente.

### 7.3. Contexto

Desde otro contenedor, `localhost` identifica ese otro contenedor.
Esta página no mezcla ejecución anfitriona y ejecución contenerizada.
Una arquitectura diferente necesita instrucciones de red diferentes.

---

## 8. Controles de seguridad

Trabajar localmente no elimina la necesidad de revisar el destino.

### 8.1. Controles principales

- Utiliza una terminal dedicada al curso.
- No cargues credenciales reales.
- Declara endpoints locales.
- Revisa todos los recursos del módulo.
- Mantén el puerto publicado en `127.0.0.1`.
- Detente ante destinos inesperados.

### 8.2. Datos del ejercicio

Solo se utilizará texto inventado.
No subas documentos privados, contraseñas ni archivos de producción.
Un servicio local puede conservar datos o aparecer en registros.

### 8.3. Límite de las credenciales ficticias

Las credenciales `test` no constituyen un cortafuegos.
Una configuración incorrecta puede intentar contactar con otro destino.
La prevención combina revisión y controles externos de red.

---

## 9. Preparar el directorio

Mantén este laboratorio separado de proyectos anteriores.

### 9.1. Crear carpetas

```bash
mkdir -p ~/cursos/terraform/primer-bucket/materiales
mkdir -p ~/cursos/terraform/primer-bucket/descargas
mkdir -p ~/cursos/terraform/primer-bucket/evidencias

cd ~/cursos/terraform/primer-bucket
```

### 9.2. Confirmar ubicación

```bash
pwd
ls -la
```

### 9.3. Precaución

No copies estados de otras prácticas.
No ejecutes Terraform desde una carpeta que contenga recursos ajenos.
Los archivos `.tf` del directorio se interpretan conjuntamente.

---

## 10. Estructura prevista

La organización separa configuración, materiales y evidencias.

### 10.1. Árbol del proyecto

```text
primer-bucket/
├── compose.yaml
├── .env
├── .env.example
├── .gitignore
├── versions.tf
├── variables.tf
├── providers.tf
├── locals.tf
├── main.tf
├── outputs.tf
├── materiales/
├── descargas/
└── evidencias/
    └── registro.md
```

### 10.2. Archivos generados

Terraform añadirá su directorio de inicialización, archivo de bloqueo y estado local.

---

## 11. Seleccionar la imagen de LocalStack

El docente debe proporcionar una referencia concreta y probada.

### 11.1. Archivo `.env.example`

```dotenv
COMPOSE_PROJECT_NAME=aula-primer-bucket
LOCALSTACK_IMAGE=localstack/localstack:ETIQUETA_PROBADA
```

### 11.2. Crear `.env`

```bash
cp .env.example .env
```

Sustituye `ETIQUETA_PROBADA` antes de continuar.
No ejecutes el laboratorio conservando el marcador.
No cambies automáticamente a `latest`.

### 11.3. Condiciones de acceso

Comprueba edición, disponibilidad de S3 y requisitos de autenticación.
Un posible token de LocalStack debe gestionarse como secreto.
No lo confundas con las credenciales ficticias de las solicitudes AWS.

---

## 12. Configurar Docker Compose

Compose gestionará el servicio local, no el bucket.

### 12.1. Archivo `compose.yaml`

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

### 12.2. Decisiones

No montamos el socket de Docker.
No configuramos persistencia explícita.
No publicamos el puerto en todas las interfaces.
No añadimos servicios ajenos al ejercicio.

### 12.3. Compatibilidad

Declarar un servicio no demuestra implementación completa.
La consulta funcional comprobará las operaciones necesarias.

---

## 13. Arrancar y observar LocalStack

Separa validación de configuración, descarga y ejecución.

### 13.1. Comandos de arranque

```bash
docker compose config --quiet
docker compose pull
docker compose up -d
docker compose ps
```

### 13.2. Comprobaciones auxiliares

```bash
docker compose port localstack 4566
docker compose logs --tail=100 localstack
curl --fail --silent --show-error \
  http://localhost:4566/_localstack/health
```

### 13.3. Interpretación

Un contenedor iniciado puede seguir inicializando servicios.
La respuesta de salud depende de la versión.
La consulta S3 posterior será una comprobación funcional.

---

## 14. Configurar AWS CLI local

AWS CLI tendrá su propia configuración por invocación.

### 14.1. Función Bash

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

### 14.2. Alcance

La función debe definirse otra vez en una terminal nueva.
No modifica los archivos personales de credenciales.

---

## 15. Ejecutar la primera consulta

Comprueba la API antes de iniciar Terraform.

### 15.1. Consulta inicial

```bash
aws_local s3api list-buckets
resultado=$?
printf 'Codigo de salida: %s\n' "$resultado"
```

### 15.2. Resultado esperado

La operación debe terminar correctamente.
Una lista vacía es válida en un entorno limpio.
Si aparecen buckets, determina su procedencia.
No elimines recursos de otros equipos.

### 15.3. Evidencia

Guarda el código inmediatamente después de la operación.
Registra endpoint, región, comando y resultado.
No interpretes una consulta satisfactoria como cobertura completa de S3.

---

## 16. Declarar las dependencias

Terraform y el provider tienen versiones independientes.

### 16.1. Archivo `versions.tf`

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

La restricción permite versiones de la serie 5.
El archivo de bloqueo conserva la selección efectiva del provider.
No bloquea la imagen de LocalStack ni Terraform CLI.

### 16.3. Política

No utilices `init -upgrade` durante una comparación sin documentarlo.

---

## 17. Definir las entradas

Las variables hacen explícitas las decisiones del laboratorio.

### 17.1. Archivo `variables.tf`

```hcl
variable "bucket_name" {
  description = "Nombre del bucket local del ejercicio."
  type        = string
  default     = "aula-primer-bucket-001"
}

variable "localstack_endpoint" {
  description = "Endpoint local del emulador."
  type        = string
  default     = "http://localhost:4566"
}

variable "environment" {
  description = "Etiqueta de entorno."
  type        = string
  default     = "local"
}
```

---

## 18. Configurar el provider

El provider utilizará credenciales ficticias y endpoints por servicio.

### 18.1. Archivo `providers.tf`

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
    s3  = var.localstack_endpoint
    sts = var.localstack_endpoint
  }
}
```

### 18.2. Precaución

Las opciones `skip_*` no son un cortafuegos.

---

## 19. Preparar etiquetas comunes

Los valores locales permiten reutilizar expresiones internas.

### 19.1. Archivo `locals.tf`

```hcl
locals {
  common_tags = {
    Curso   = "Terraform"
    Entorno = var.environment
    Unidad  = "PrimerBucket"
    Gestion = "Terraform"
  }
}
```

### 19.2. Variables y locales

`var.environment` es una entrada.
`local.common_tags` es un valor interno derivado.
Un local no se proporciona directamente mediante `-var`.

### 19.3. Uso responsable

No incluyas información personal en etiquetas.
Las etiquetas pueden aparecer en consultas, estado y registros.

---

## 20. Declarar el bucket

El recurso principal describe el bucket que Terraform gestionará.

### 20.1. Archivo `main.tf`

```hcl
resource "aws_s3_bucket" "laboratorio" {
  bucket        = var.bucket_name
  force_destroy = false

  tags = local.common_tags
}
```

### 20.2. Lectura del bloque

`aws_s3_bucket` identifica el tipo de recurso.
`laboratorio` es su etiqueta dentro del módulo.
`bucket` configura el nombre del recurso en S3.
`tags` recibe el mapa de etiquetas.

### 20.3. Dirección de Terraform

La dirección será `aws_s3_bucket.laboratorio`.
No es el nombre del bucket ni su endpoint.

---

## 21. Comprender `force_destroy`

Esta opción participa en el comportamiento de eliminación.

### 21.1. Decisión del laboratorio

Utilizamos:

```hcl
force_destroy = false
```

Un bucket vacío puede destruirse.
Si contiene objetos, la operación puede fallar porque no se solicita su vaciado automático.
La práctica enseñará a eliminar primero el objeto creado mediante CLI.

### 21.2. Lo que no significa

No es equivalente a impedir toda destrucción.
No es un mecanismo de autorización.
No convierte los objetos externos en recursos gestionados.

### 21.3. Regla

No cambies a `true` para ocultar una limpieza no comprendida.
En un proyecto real, el vaciado automático requiere una decisión explícita.

---

## 22. Definir las salidas

Las salidas exponen información útil del recurso.

### 22.1. Archivo `outputs.tf`

```hcl
output "bucket_name" {
  description = "Nombre del bucket gestionado."
  value       = aws_s3_bucket.laboratorio.bucket
}

output "bucket_arn" {
  description = "ARN informado para el bucket."
  value       = aws_s3_bucket.laboratorio.arn
}
```

### 22.2. Alcance

La salida se obtiene del estado y de la evaluación de Terraform.
No sustituye una consulta independiente a S3.
El ARN local no certifica una identidad o cuenta real.

### 22.3. Diseño

Expón datos útiles; no publiques atributos innecesarios.

---

## 23. Proteger los archivos locales

El repositorio debe separar configuración y datos generados.

### 23.1. Archivo `.gitignore`

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
evidencias/*debug*.log
```

### 23.2. Archivos compartibles

Conserva los archivos `.tf`, ejemplos saneados y `.terraform.lock.hcl`.
Los estados y planes pueden contener información sensible.
Revisa las evidencias antes de compartirlas.
Un archivo ignorado puede seguir registrado si ya estaba en Git.

---

## 24. Inicializar el proyecto

La inicialización prepara las dependencias del módulo.

### 24.1. Ejecutar

```bash
terraform init
terraform providers
```

### 24.2. Qué observar

Comprueba el origen del provider.
Registra la versión seleccionada.
Identifica la creación de `.terraform/`.
Comprueba la presencia de `.terraform.lock.hcl`.

### 24.3. Lo que no ocurre

La inicialización no crea el bucket.
No demuestra que todas las operaciones de LocalStack funcionen.
Puede necesitar acceso al registro de providers o a una caché autorizada.

### 24.4. Entorno de red

Las descargas de herramientas son distintas de las solicitudes del laboratorio a S3.

---

## 25. Formatear y validar

Estas operaciones comprueban aspectos diferentes del código.

### 25.1. Comandos

```bash
terraform fmt
terraform validate
```

### 25.2. Interpretación

`fmt` normaliza el formato.
`validate` comprueba aspectos de sintaxis y coherencia.
Un resultado satisfactorio no demuestra que la API esté disponible.
Tampoco certifica seguridad ni compatibilidad funcional completa.

### 25.3. Diagnóstico inicial

Si aparece un atributo desconocido, revisa el esquema y la versión.
Si aparece una referencia inexistente, comprueba nombres y archivos.
No continúes con errores de validación.

### 25.4. Evidencia

Registra el comando y el resultado, no solo una captura sin contexto.

---

## 26. Generar el primer plan

El plan describe los cambios propuestos antes de aplicarlos.

### 26.1. Ejecutar

```bash
terraform plan
```

### 26.2. Qué debes localizar

Busca `aws_s3_bucket.laboratorio`.
Comprueba el nombre del bucket.
Revisa las etiquetas.
Comprueba que no se proponen recursos de otros servicios.
Identifica los valores conocidos después de aplicar.

### 26.3. Lectura de símbolos

El símbolo `+` indica creación.
El símbolo `~` suele indicar actualización.
El símbolo `-` indica destrucción.
Una combinación de destrucción y creación puede indicar reemplazo.

### 26.4. Detención

Un cambio inesperado obliga a revisar antes de aplicar.

---

## 27. Guardar un plan revisable

Un plan guardado permite aplicar la propuesta concreta que se revisó.

### 27.1. Crear y consultar

```bash
terraform plan -out=primer-despliegue.tfplan
terraform show primer-despliegue.tfplan
```

### 27.2. Revisión por parejas

Una persona explica los recursos.
La otra comprueba nombre, etiquetas y operaciones.
Ambas confirman que el destino configurado es local.
No aceptéis el plan únicamente porque terminó sin errores.

### 27.3. Protección

El archivo de plan puede contener datos sensibles.
No lo publiques ni lo utilices como documento de ejemplo sin sanear.
Si cambias configuración o entradas, genera otro plan.

### 27.4. Regla

Un plan guardado es un artefacto operativo, no una garantía permanente.

---

## 28. Aplicar el primer despliegue

Aplicaremos el plan guardado después de revisarlo.

### 28.1. Ejecutar

```bash
terraform apply primer-despliegue.tfplan
```

### 28.2. Atención a la confirmación

Al aplicar un plan guardado, Terraform no solicita la confirmación interactiva habitual.
La decisión de ejecutarlo debe tomarse antes del comando.
No confundas este comportamiento con una revisión automática.

### 28.3. Resultado esperado

El recurso debe quedar registrado en el estado.
Las salidas deben mostrar el nombre y el ARN informado.
La forma exacta de los mensajes puede variar.

### 28.4. Si falla

Conserva el error saneado y comprueba el estado antes de repetir.

---

## 29. Consultar el estado

El estado relaciona direcciones de Terraform y recursos gestionados.

### 29.1. Consultas

```bash
terraform state list
terraform state show aws_s3_bucket.laboratorio
terraform output
```

### 29.2. Qué observar

La lista debe incluir el recurso del bucket.
La consulta detallada muestra atributos registrados.
Las salidas seleccionan información útil de ese conjunto.

### 29.3. Límite importante

`terraform state list` no es un inventario completo de S3.
Tampoco demuestra por sí solo que el recurso siga existiendo.
Los recursos externos no aparecen automáticamente.

### 29.4. Seguridad

No publiques el archivo de estado completo como evidencia de clase.

---

## 30. Verificar el bucket mediante AWS CLI

La API aportará una evidencia independiente del estado.

### 30.1. Recuperar el nombre

```bash
BUCKET_NAME=$(terraform output -raw bucket_name)
printf 'Bucket del ejercicio: %s\n' "$BUCKET_NAME"
```

### 30.2. Comprobar existencia

```bash
aws_local s3api head-bucket \
  --bucket "$BUCKET_NAME"
```

### 30.3. Interpretación

Comprueba que la salida anterior produjo un nombre válido.
No continúes si la variable está vacía.
Una operación `head-bucket` satisfactoria puede no imprimir contenido.

### 30.4. Código de salida

Guarda `$?` inmediatamente si necesitas documentar el resultado del proceso.

---

## 31. Verificar las etiquetas

La existencia y las propiedades requieren comprobaciones distintas.

### 31.1. Consulta

```bash
aws_local s3api get-bucket-tagging \
  --bucket "$BUCKET_NAME"
```

### 31.2. Criterio de aceptación

Deben aparecer las claves previstas.
Sus valores deben coincidir con las entradas efectivas.
No exijas un orden específico de etiquetas sin necesidad.
Compara el contenido semántico.

### 31.3. Lo que demuestra

La consulta confirma las etiquetas observadas en el servicio local.
No demuestra la aplicación de permisos IAM.
No valida todas las configuraciones del bucket.

### 31.4. Registro

Incluye el nombre consultado y la versión del entorno.

---

## 32. Comprobar la convergencia

Un segundo plan ayuda a comprobar la estabilidad del despliegue.

### 32.1. Ejecutar

```bash
terraform plan
```

### 32.2. Resultado esperado

Si no cambiaste entradas, configuración ni recursos, no deberían proponerse cambios.
Este resultado muestra convergencia dentro del alcance evaluado.
No demuestra seguridad completa ni equivalencia con AWS.

### 32.3. Si aparecen diferencias

Revisa los atributos afectados.
Comprueba si cambió una variable.
Investiga modificaciones externas.
Considera diferencias de comportamiento del provider o del emulador.

### 32.4. Regla

No apliques repetidamente sin entender una diferencia persistente.

---

## 33. Crear contenido ficticio

La prueba de objetos utilizará únicamente material inventado.

### 33.1. Preparar archivo

```bash
printf 'Primer despliegue local de un bucket S3.\n' \
  > materiales/mensaje-cli.txt

cat materiales/mensaje-cli.txt
```

### 33.2. Revisión previa

Comprueba que el archivo no contiene secretos.
Verifica que pertenece a este laboratorio.
No sustituyas el ejemplo por documentos personales.

### 33.3. Responsabilidad

El archivo local y el objeto S3 tendrán ciclos de vida independientes.
Eliminar uno no elimina automáticamente el otro.
La limpieza debe identificar ambos.

---

## 34. Subir y listar el objeto

AWS CLI creará un objeto fuera de la gestión declarativa del proyecto.

### 34.1. Subida

```bash
aws_local s3api put-object \
  --bucket "$BUCKET_NAME" \
  --key practicas/mensaje-cli.txt \
  --body materiales/mensaje-cli.txt
```

### 34.2. Listado

```bash
aws_local s3api list-objects-v2 \
  --bucket "$BUCKET_NAME"
```

### 34.3. Criterio de aceptación

Debe aparecer la clave enviada.
El tamaño debe ser coherente con el archivo.
No presupongas valores idénticos para todos los atributos entre versiones.
El objeto no aparecerá automáticamente en `terraform state list`.

---

## 35. Descargar y comparar contenido

Una verificación de contenido necesita recuperar los bytes almacenados.

### 35.1. Descargar

```bash
aws_local s3api get-object \
  --bucket "$BUCKET_NAME" \
  --key practicas/mensaje-cli.txt \
  descargas/mensaje-cli.txt
```

### 35.2. Comparar

```bash
cmp materiales/mensaje-cli.txt descargas/mensaje-cli.txt
resultado=$?
printf 'Resultado de comparacion: %s\n' "$resultado"
```

### 35.3. Interpretación

Un resultado correcto de `cmp` indica igualdad byte a byte.
Una descarga que creó un archivo no basta para demostrar igualdad.
El ETag no debe tratarse como un MD5 universal.
Esta prueba no valida durabilidad real de AWS.

---

## 36. Modificar una etiqueta mediante Terraform

El siguiente cambio será una actualización pequeña y comprensible.

### 36.1. Cambio de configuración

En `locals.tf`, modifica:

```hcl
Unidad = "PrimerBucketVerificado"
```

Mantén el nombre del bucket.
No cambies otros atributos durante esta prueba.

### 36.2. Revisar y aplicar

```bash
terraform fmt
terraform plan
terraform apply
```

### 36.3. Criterio

El plan debería reflejar una actualización de etiquetas, no un reemplazo del bucket.
Después consulta las etiquetas mediante AWS CLI.
Confirma que el objeto sigue disponible.

---

## 37. Nombres y reemplazos

Cambiar el nombre del bucket no es equivalente a cambiar una etiqueta.

### 37.1. Diferencia conceptual

El nombre identifica el recurso en S3.
El provider puede tratar determinados cambios como reemplazo.
Un reemplazo combina operaciones de eliminación y creación.

### 37.2. Ejercicio de análisis

Sin aplicar, explica qué riesgos tendría renombrar un bucket con objetos.
Identifica el papel de `force_destroy = false`.
Distingue contenido, recurso y dirección de Terraform.

### 37.3. Precaución

No cambies el nombre en el laboratorio principal.
No confirmes un reemplazo solo para observar qué ocurre.
Una actividad de reemplazo necesita instrucciones y limpieza específicas.

### 37.4. Idea esencial

La magnitud del cambio se determina leyendo el plan, no contando líneas editadas.

---

## 38. Ampliación: gestionar un objeto con Terraform

Esta actividad añade otro objeto, con una clave diferente.

### 38.1. Preparar el archivo

```bash
printf 'Objeto gestionado mediante Terraform.\n' \
  > materiales/mensaje-terraform.txt
```

### 38.2. Archivo opcional `objects.tf`

```hcl
resource "aws_s3_object" "mensaje" {
  bucket      = aws_s3_bucket.laboratorio.id
  key         = "practicas/mensaje-terraform.txt"
  source      = "${path.module}/materiales/mensaje-terraform.txt"
  source_hash = filemd5("${path.module}/materiales/mensaje-terraform.txt")
}
```

### 38.3. Relación

La referencia al bucket expresa una dependencia.
No se utiliza la misma clave que el objeto creado mediante CLI.

---

## 39. Verificar el objeto declarativo

La ampliación debe comprobar recurso, contenido y seguimiento.

### 39.1. Ejecutar

```bash
terraform fmt
terraform validate
terraform plan
terraform apply
terraform state list
```

### 39.2. Consulta de contenido

```bash
aws_local s3api get-object \
  --bucket "$BUCKET_NAME" \
  --key practicas/mensaje-terraform.txt \
  descargas/mensaje-terraform.txt

cmp materiales/mensaje-terraform.txt descargas/mensaje-terraform.txt
```

### 39.3. Alcance

`source_hash` ayuda a detectar cambios del archivo fuente.
No garantiza que se detecten todas las modificaciones externas del contenido.

---

## 40. Sesión práctica A: primer despliegue

La primera sesión construye el laboratorio principal hasta la verificación del bucket.

### 40.1. Duración y objetivo

Duración orientativa: 45 minutos, con herramientas instaladas.
Objetivo: desplegar un bucket y explicar las evidencias obtenidas.

### 40.2. Actividades

1. Prepara carpeta e imagen.
2. Arranca LocalStack.
3. Consulta S3 mediante AWS CLI.
4. Escribe los archivos Terraform.
5. Inicializa y valida.
6. Revisa el plan por parejas.
7. Aplica y consulta el bucket.

### 40.3. Entregable

Entrega configuración, versiones y tres evidencias saneadas.
Explica qué procede del estado y qué procede de la API.

---

## 41. Sesión práctica B: contenido y actualización

La segunda sesión añade uso del bucket y un cambio controlado.

### 41.1. Duración y objetivo

Duración orientativa: 35 minutos.
Objetivo: comprobar contenido recuperable y actualizar una etiqueta.

### 41.2. Actividades

Crea el archivo ficticio.
Sube y lista el objeto mediante CLI.
Descarga y compara.
Modifica una etiqueta mediante Terraform.
Revisa el plan y aplica.
Consulta las etiquetas y el objeto.

### 41.3. Revisión por parejas

Una persona ejecuta y la otra interpreta.
Después intercambian funciones.
No basta con mostrar comandos sin explicar sus resultados.

### 41.4. Entregable

Entrega la comparación de archivos y el cambio observado en las etiquetas.

---

## 42. Sesión práctica C: gestión y limpieza

La tercera sesión distingue recursos declarativos y objetos externos.

### 42.1. Duración y objetivo

Duración orientativa: 30 minutos.
Objetivo: completar la ampliación opcional y limpiar con responsabilidades claras.

### 42.2. Actividades

Añade el objeto Terraform si la ampliación está autorizada.
Comprueba el estado.
Compara las dos claves S3.
Elimina el objeto CLI.
Revisa el plan de destrucción.
Destruye y verifica.

### 42.3. Preguntas de revisión

¿Por qué Terraform conoce un objeto y no el otro?
¿Por qué el objeto externo puede bloquear la destrucción del bucket?
¿Qué evidencia confirma la limpieza?

### 42.4. Entregable

Entrega un registro de recursos, herramientas responsables y comprobaciones finales.

---

## 43. Diagnóstico de errores frecuentes

Un fallo necesita investigación, no una causa inventada.

### 43.1. Tabla orientativa

La tabla propone comprobaciones iniciales.

| **Síntoma** | **Comprobación** | **Qué evitar** |
|-------------|------------------|----------------|
| Conexión rechazada | Contenedor y puerto | Cambiar a AWS real |
| Nombre rechazado | Entrada y reglas S3 | Reintentar sin cambios |
| Bucket ya existente | Instancia y nombres | Borrar recursos ajenos |
| Etiquetas diferentes | Entradas y cambios externos | Aplicar sin revisar |
| Bucket no vacío | Objetos y alcance de limpieza | Activar vaciado automático |

Las comprobaciones son puntos de partida, no diagnósticos definitivos.

### 43.2. Procedimiento

Registra comando, error saneado y contexto.
Formula una hipótesis.
Cambia una condición relevante y repite.

---

## 44. Códigos de salida y automatización

El código del proceso debe interpretarse según el comando utilizado.

### 44.1. Plan con resultado detallado

```bash
terraform plan -detailed-exitcode
resultado=$?
printf 'Codigo del plan: %s\n' "$resultado"
```

### 44.2. Interpretación

Con esta opción:

- `0` indica un plan satisfactorio sin cambios.
- `1` indica un error.
- `2` indica un plan satisfactorio con cambios.

Estos significados no deben trasladarse automáticamente a AWS CLI.
Guarda el resultado antes de ejecutar otro comando.

### 44.3. Matiz de scripts

En scripts con terminación automática ante códigos no nulos, gestiona explícitamente el código `2`.
No lo clasifiques como fallo del despliegue.

---

## 45. Limpieza de recursos

Elimina primero el objeto creado mediante CLI.

### 45.1. Limpieza externa

```bash
aws_local s3api delete-object \
  --bucket "$BUCKET_NAME" \
  --key practicas/mensaje-cli.txt

aws_local s3api list-objects-v2 \
  --bucket "$BUCKET_NAME"
```

### 45.2. Destrucción declarativa

```bash
terraform plan -destroy
terraform destroy
```

### 45.3. Condición

Si hiciste la ampliación, conserva `objects.tf` para destruir su recurso mediante Terraform.
No elimines el objeto declarativo manualmente durante el flujo principal.

---

## 46. Verificación final del entorno

La limpieza se comprueba antes de retirar LocalStack.

### 46.1. Consultas finales

```bash
terraform state list
aws_local s3api list-buckets
```

Comprueba que el bucket del ejercicio ya no aparece.
Otros buckets pueden pertenecer a otros equipos.
No los elimines.

### 46.2. Retirar Compose

Si la instancia es exclusiva del proyecto:

```bash
docker compose down
```

### 46.3. Precaución

Detener el contenedor no equivale a destruir recursos mediante Terraform.
No borres el estado para ocultar una destrucción fallida.

---

## 47. Diferencias respecto a AWS real

El laboratorio enseña procedimientos con límites explícitos.

### 47.1. Diferencias esenciales

LocalStack no es una cuenta de AWS.
Las credenciales ficticias no validan identidades reales.
Los resultados no representan cuotas, costes ni disponibilidad de AWS.
Los permisos y errores pueden diferir.
El comportamiento depende de versión, modalidad y configuración.

### 47.2. Transición futura

AWS real necesita identidad, autorización y control de costes.
También requiere decisiones sobre seguridad, datos y limpieza.
No consiste simplemente en eliminar los endpoints locales.
El nombre utilizado aquí puede no estar disponible allí.

### 47.3. Conclusión limitada

Este ejercicio verifica un ciclo básico de bucket y objetos en el entorno registrado.
No certifica una arquitectura de almacenamiento productiva.

---

## 48. Evaluación, registro y resumen

El aprendizaje se demuestra explicando resultados y responsabilidades.

### 48.1. Rúbrica inicial

La tabla resume los criterios de revisión.

| **Criterio** | **Evidencia requerida** | **Puntos** |
|-------------|-------------------------|------------|
| Configuración | Versiones y destino local revisados | 0–2 |
| Despliegue | Plan comprendido y bucket creado | 0–2 |
| Verificación | Estado, API y contenido comparados | 0–2 |
| Cambio | Etiqueta actualizada sin reemplazo inesperado | 0–2 |
| Limpieza | Recursos eliminados y registro saneado | 0–2 |

La puntuación máxima es diez.
Un fallo crítico de seguridad no queda compensado por una puntuación alta.

### 48.2. Registro y cierre

Conserva fecha, versiones, entradas, comandos, resultados y limitaciones.
Distingue lo esperado de lo observado y documenta la limpieza.
**Declara, revisa, aplica, verifica y limpia: ese es el ciclo completo de tu primer despliegue.**