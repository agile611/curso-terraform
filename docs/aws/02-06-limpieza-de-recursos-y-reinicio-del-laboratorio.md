# Limpieza de recursos y reinicio del laboratorio con Terraform y LocalStack

> Curso de Terraform con LocalStack emulando servicios de AWS.
> Todas las prácticas de esta lección se ejecutan localmente.
> Utiliza exclusivamente credenciales ficticias y endpoints locales.
> No necesitas una cuenta de AWS para completar el laboratorio.
> No elimines recursos, contenedores o volúmenes de otros proyectos.
> Una prueba satisfactoria en LocalStack no equivale a validar AWS real.

Limpiar un laboratorio no consiste únicamente en detener un contenedor.
También implica eliminar los recursos gestionados, comprobar los objetos externos y conservar un estado coherente.
El reinicio debe permitir repetir la práctica sin confundir recursos antiguos con recursos nuevos.

Esta lección distingue cuatro operaciones: destruir infraestructura, detener servicios, retirar contenedores y restablecer datos.
Cada operación tiene un alcance diferente.
Elegir la adecuada evita pérdida de información y errores en las siguientes sesiones.

Terraform gestionará los recursos declarativos.
AWS CLI ayudará a observar el servicio y eliminar un objeto externo de práctica.
Docker Compose gestionará el entorno de emulación.
La documentación incluirá comprobaciones antes y después de cada cambio relevante.

---

## 1. Objetivos de aprendizaje

Esta unidad enseña a cerrar y repetir una práctica con evidencias claras.

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Diferenciar destrucción de recursos y retirada del emulador.
- Explicar por qué el estado debe conservarse durante la limpieza.
- Reconocer el alcance de contenedores, redes y volúmenes.
- Distinguir reinicio operativo y restablecimiento de datos.
- Identificar riesgos en un entorno compartido.

### 1.2. Objetivos prácticos

También podrás:

- Revisar un plan de destrucción.
- Eliminar un objeto externo identificado.
- Comprobar la ausencia de recursos.
- Retirar únicamente el proyecto Compose del laboratorio.
- Volver a desplegar y verificar la práctica.

---

## 2. Alcance y exclusiones

El laboratorio utiliza un entorno exclusivo para facilitar la interpretación.

### 2.1. Alcance principal

Trabajaremos con:

- Un bucket S3 gestionado por Terraform.
- Un objeto S3 gestionado por Terraform.
- Un objeto adicional creado mediante AWS CLI.
- Un servicio LocalStack gestionado mediante Compose.
- Estado local de Terraform.

### 2.2. Fuera del alcance principal

No utilizaremos:

- AWS real.
- Recursos de producción.
- Limpieza global de Docker.
- Eliminación indiscriminada de archivos.
- Backends remotos.
- Borrado masivo de versiones S3.

### 2.3. Ampliaciones

El versionado, los volúmenes y la recuperación de estado se estudiarán con condiciones específicas.

---

## 3. Requisitos previos

Comprueba las herramientas antes de ejecutar operaciones destructivas.

### 3.1. Comandos de identificación

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
`jq` se utilizará para comprobar coincidencias exactas en JSON.
Los comandos de terminal utilizan Bash.

### 3.3. Conocimientos necesarios

Debes comprender el ciclo básico de Terraform.
También debes reconocer el directorio del proyecto y el endpoint local.
Resuelve errores de instalación antes de continuar.

---

## 4. Versiones y reproducibilidad

Las opciones de limpieza dependen de las herramientas y del entorno.

### 4.1. Base didáctica

La configuración permitirá Terraform desde 1.6 y anterior a 2.0.
El provider de AWS se limitará a la serie 5.
LocalStack utilizará una referencia concreta proporcionada por el docente.
Estas restricciones no representan una lista de versiones más recientes.

### 4.2. Registro mínimo

Conserva:

- Terraform CLI.
- Provider seleccionado.
- Docker y Docker Compose.
- AWS CLI y `jq`.
- Imagen y modalidad de LocalStack.
- Sistema y arquitectura.

### 4.3. Condición docente

La combinación debe probarse antes de impartir la sesión.
Esta página no afirma haber ejecutado los comandos en tu equipo.

---

## 5. Vocabulario de limpieza

Las palabras utilizadas deben indicar el alcance de la operación.

### 5.1. Destrucción de infraestructura

Terraform elimina recursos vinculados a la configuración y al estado.
La operación se realiza mediante el provider.
El emulador debe estar disponible para atender las solicitudes.

### 5.2. Detención

El proceso del contenedor deja de ejecutarse.
El contenedor puede permanecer creado.
Los recursos emulados no se eliminan necesariamente de forma controlada.

### 5.3. Retirada

Compose elimina determinados componentes del proyecto.
El alcance habitual incluye sus contenedores y redes administradas.
Los datos persistentes requieren una evaluación aparte.

### 5.4. Restablecimiento

El laboratorio vuelve a una condición inicial definida.
No significa automáticamente borrar todo.
Debe especificarse qué se conserva y qué se elimina.

---

## 6. Comparación de operaciones

La tabla resume diferencias que utilizaremos durante la práctica.

### 6.1. Operaciones habituales

| **Operación** | **Alcance principal** | **Precaución** |
|---------------|----------------------|----------------|
| `terraform destroy` | Recursos gestionados en el estado seleccionado | Revisar configuración y destino |
| `docker compose stop` | Procesos de contenedores | No equivale a limpiar recursos |
| `docker compose restart` | Reinicio de contenedores existentes | No aplica todos los cambios de configuración |
| `docker compose down` | Componentes Compose administrados | Revisar proyecto y persistencia |
| Retirada de volumen | Datos del volumen identificado | Puede ser irreversible |

Las operaciones no son intercambiables.

### 6.2. Regla principal

**Primero limpia la infraestructura; después retira el entorno que permite gestionarla.**

### 6.3. Excepción investigada

Si el emulador ya está perdido, primero determina qué ocurrió.
No borres el estado para ocultar la diferencia.

---

## 7. Configuración, estado y recursos

Una limpieza correcta relaciona tres fuentes diferentes.

### 7.1. Configuración

Los archivos `.tf` describen la intención.
Eliminar un archivo no ejecuta automáticamente una destrucción.
Un plan posterior puede proponer cambios porque la intención ha cambiado.

### 7.2. Estado

El estado conserva relaciones con recursos gestionados.
Debe permanecer disponible durante la limpieza.
También puede contener datos sensibles.

### 7.3. API

La API informa sobre recursos observables en el entorno.
Puede incluir recursos que Terraform no gestiona.
Por eso el estado no es un inventario completo del servicio.

### 7.4. Consecuencia

No concluyas una limpieza completa únicamente porque `terraform state list` está vacío.
Comprueba también los nombres concretos del ejercicio.

---

## 8. Recursos gestionados y objetos externos

La herramienta de creación determina responsabilidades de seguimiento.

### 8.1. Recursos Terraform

El bucket y un objeto estarán declarados.
Terraform conocerá sus direcciones.
Su eliminación se realizará mediante Terraform.

### 8.2. Objeto externo

Otro objeto se creará mediante AWS CLI.
No estará declarado como recurso del proyecto.
Se eliminará mediante una operación explícita de CLI.

### 8.3. Riesgo del bucket no vacío

El objeto externo puede impedir destruir el bucket.
La destrucción del objeto declarativo no elimina automáticamente el objeto externo.

### 8.4. Regla de responsabilidad

Consulta primero.
Identifica después.
Elimina únicamente el recurso que pertenece al ejercicio.
No vacíes un bucket compartido para resolver un error.

---

## 9. Seguridad del entorno

Antes de destruir, comprueba destino, propiedad y autorización.

### 9.1. Controles básicos

- Utiliza una terminal dedicada.
- Mantén credenciales ficticias.
- Declara endpoints locales.
- Revisa todos los recursos del módulo.
- Confirma que la instancia es exclusiva.
- Conserva evidencias saneadas.

### 9.2. Lo que no garantiza aislamiento

Un nombre de perfil no es un cortafuegos.
Las credenciales `test` tampoco lo son.
Una opción `skip_*` no impide tráfico externo.

### 9.3. Detención obligatoria

Detén la práctica ante destinos inesperados.
No introduzcas claves reales para resolver fallos.
Los controles externos de red siguen siendo importantes cuando el riesgo lo exige.

---

## 10. Contexto de Docker y proyecto Compose

Docker puede administrar un motor diferente del que esperas.

### 10.1. Comprobar contexto

```bash
docker context show
docker compose ls
```

### 10.2. Interpretación

El contexto puede apuntar a otro motor.
Un nombre conocido no demuestra que sea tu equipo local.
Comprueba también variables de conexión si el entorno las utiliza.

### 10.3. Identidad Compose

El nombre del proyecto delimita sus componentes.
Cambiarlo puede hacer que los comandos observen otro conjunto.
La ubicación del archivo y las opciones de invocación también importan.

### 10.4. Regla

No uses un motor compartido sin autorización.
Antes de `down`, confirma el proyecto y el contexto.
No detengas servicios ajenos para liberar un puerto.

---

## 11. Preparar el directorio

La práctica utilizará una carpeta exclusiva.

### 11.1. Crear estructura

```bash
mkdir -p ~/cursos/terraform/limpieza-localstack/materiales
mkdir -p ~/cursos/terraform/limpieza-localstack/evidencias
mkdir -p ~/cursos/terraform/limpieza-localstack/scripts

cd ~/cursos/terraform/limpieza-localstack
```

### 11.2. Confirmar ubicación

```bash
pwd
ls -la
```

### 11.3. Precaución

No copies estados de lecciones anteriores.
No añadas esta configuración dentro de un módulo con recursos ajenos.
Terraform interpreta conjuntamente los archivos `.tf` del directorio.

---

## 12. Estructura del laboratorio

La organización separa entorno, recursos y comprobaciones.

### 12.1. Árbol inicial

```text
limpieza-localstack/
├── compose.yaml
├── .env
├── .env.example
├── versions.tf
├── providers.tf
├── main.tf
├── outputs.tf
├── .gitignore
├── materiales/
│   └── gestionado.txt
├── scripts/
│   └── cliente-local.sh
└── evidencias/
    └── registro.md
```

### 12.2. Archivos generados

Terraform añadirá inicialización, bloqueo y estado.
Los planes guardados serán artefactos locales protegidos.

---

## 13. Seleccionar la imagen

El docente debe proporcionar una referencia probada.

### 13.1. Archivo `.env.example`

```dotenv
COMPOSE_PROJECT_NAME=aula-limpieza
LOCALSTACK_IMAGE=localstack/localstack:ETIQUETA_PROBADA
```

### 13.2. Crear configuración

```bash
cp .env.example .env
```

Sustituye `ETIQUETA_PROBADA` antes de continuar.
No cambies automáticamente a `latest`.
Comprueba modalidad, disponibilidad de S3 y autenticación requerida.

### 13.3. Secretos

Un token de LocalStack no es la secret key ficticia de AWS.
Si se necesita, utiliza un procedimiento autorizado.
No lo publiques en archivos compartidos.

---

## 14. Configuración de Compose

El laboratorio principal no utiliza persistencia explícita.

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

### 14.2. Decisiones

No montamos el socket de Docker.
No configuramos volúmenes de datos.
No publicamos el puerto en todas las interfaces.
No incluimos servicios ajenos.

### 14.3. Alcance

No presupongas conservación de recursos al recrear el entorno.
La compatibilidad debe comprobarse en la imagen seleccionada.

---

## 15. Arrancar y observar LocalStack

Comprueba el emulador antes de desplegar.

### 15.1. Arranque

```bash
docker compose config --quiet
docker compose pull
docker compose up -d
docker compose ps
```

### 15.2. Observación

```bash
docker compose port localstack 4566
docker compose logs --tail=100 localstack
```

### 15.3. Criterio

El puerto publicado debe coincidir con el endpoint.
El contenedor debe corresponder al proyecto esperado.
Un estado de ejecución no demuestra disponibilidad de todas las APIs.
La consulta funcional aportará otra evidencia.

---

## 16. AWS CLI con destino explícito

La función utilizará credenciales ficticias por invocación.

### 16.1. Archivo `scripts/cliente-local.sh`

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
    --output json \
    "$@"
}
```

### 16.2. Alcance

El archivo debe revisarse antes de cargarlo.
No constituye aislamiento completo de red.

---

## 17. Activar el cliente local

Cada terminal necesita cargar la función.

### 17.1. Comandos

```bash
source scripts/cliente-local.sh
type aws_local
aws_local s3api list-buckets
```

### 17.2. Interpretación

`source` ejecuta el contenido en la sesión actual.
Utiliza únicamente archivos conocidos y revisados.
Una lista vacía es válida en un entorno limpio.

### 17.3. Recursos preexistentes

Si aparecen buckets, investiga su procedencia.
No concluyas que puedes eliminarlos.
El laboratorio solo limpiará nombres y claves expresamente identificados.

### 17.4. Registro

Anota endpoint, región, operación y resultado.
No publiques configuraciones personales.

---

## 18. Dependencias de Terraform

La dependencia del provider debe ser explícita.

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

### 18.2. Interpretación

La restricción permite versiones de la serie 5.
El archivo de bloqueo conserva la selección efectiva.
No fija la imagen de LocalStack.

### 18.3. Política

No actualices dependencias durante una prueba de limpieza sin registrarlo.

---

## 19. Provider de AWS local

La conexión de Terraform será independiente de AWS CLI.

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

### 19.2. Precaución

Las opciones de omisión no son un cortafuegos.

---

## 20. Recursos declarativos

El bucket tendrá un objeto gestionado por Terraform.

### 20.1. Preparar contenido

```bash
printf 'Objeto gestionado para la practica de limpieza.\n' \
  > materiales/gestionado.txt
```

### 20.2. Archivo `main.tf`

```hcl
resource "aws_s3_bucket" "laboratorio" {
  bucket        = "aula-limpieza-bucket-001"
  force_destroy = false
}

resource "aws_s3_object" "gestionado" {
  bucket      = aws_s3_bucket.laboratorio.id
  key         = "practicas/gestionado.txt"
  source      = "${path.module}/materiales/gestionado.txt"
  source_hash = filemd5("${path.module}/materiales/gestionado.txt")
}
```

### 20.3. Dependencia

La referencia al bucket permite a Terraform relacionar ambos recursos.

---

## 21. Salidas y despliegue

Las salidas proporcionarán identificadores para las comprobaciones.

### 21.1. Archivo `outputs.tf`

```hcl
output "bucket_name" {
  value = aws_s3_bucket.laboratorio.bucket
}

output "managed_key" {
  value = aws_s3_object.gestionado.key
}
```

### 21.2. Ejecutar

```bash
terraform init
terraform fmt
terraform validate
terraform plan
terraform apply
```

### 21.3. Revisión

Lee la propuesta antes de confirmar.
Deben aparecer únicamente los recursos previstos.

---

## 22. Conservar los identificadores

Necesitarás los nombres también después de destruir.

### 22.1. Variables de sesión

```bash
BUCKET_NAME=$(terraform output -raw bucket_name)
MANAGED_KEY=$(terraform output -raw managed_key)
EXTERNAL_KEY="practicas/externo.txt"
```

### 22.2. Registro saneado

```bash
jq -n \
  --arg bucket "$BUCKET_NAME" \
  --arg managed "$MANAGED_KEY" \
  --arg external "$EXTERNAL_KEY" \
  '{bucket: $bucket, managed_key: $managed, external_key: $external}' \
  > evidencias/identificadores.json
```

### 22.3. Condición

Comprueba que las salidas terminaron correctamente.
No continúes con nombres vacíos.
Este registro no es una copia de seguridad del estado.

---

## 23. Añadir un objeto externo

El objeto permitirá comprender un bloqueo por bucket no vacío.

### 23.1. Crear contenido ficticio

```bash
printf 'Objeto externo creado mediante AWS CLI.\n' \
  > materiales/externo.txt
```

### 23.2. Subir

```bash
aws_local s3api put-object \
  --bucket "$BUCKET_NAME" \
  --key "$EXTERNAL_KEY" \
  --body materiales/externo.txt
```

### 23.3. Responsabilidad

Este objeto no está declarado en Terraform.
Su clave es diferente de la clave gestionada.
No lo importaremos durante la práctica.
La eliminación se realizará de forma explícita.

---

## 24. Inventario previo a la limpieza

Consulta estado y API antes de ejecutar operaciones destructivas.

### 24.1. Estado

```bash
terraform state list
```

### 24.2. Objetos observables

```bash
aws_local s3api list-objects-v2 \
  --bucket "$BUCKET_NAME" \
  > evidencias/objetos-iniciales.json
```

### 24.3. Lectura

La API debe mostrar las dos claves del ejercicio.
El estado debe mostrar bucket y objeto declarativo.
La diferencia es esperada y debe documentarse.

### 24.4. Detención

Si aparecen objetos adicionales, no los elimines.
Investiga su propiedad antes de continuar.

---

## 25. Revisar un plan de destrucción

La revisión debe realizarse con LocalStack disponible.

### 25.1. Plan preliminar

```bash
terraform plan -destroy
```

### 25.2. Qué observar

Comprueba las direcciones afectadas.
Identifica el objeto gestionado y el bucket.
No esperes que aparezca el objeto externo.
El plan no es un inventario completo del bucket.

### 25.3. Límite importante

Un plan válido no garantiza que la destrucción termine.
El objeto externo puede impedir eliminar el bucket.
Por eso se necesita una comprobación adicional de contenido.

### 25.4. Regla

No apliques todavía.
Primero elimina únicamente el objeto externo autorizado.

---

## 26. Eliminar el objeto externo

Esta operación se limita a una clave conocida de un bucket conocido.

### 26.1. Comprobar la clave

```bash
aws_local s3api head-object \
  --bucket "$BUCKET_NAME" \
  --key "$EXTERNAL_KEY"
```

### 26.2. Eliminar

```bash
aws_local s3api delete-object \
  --bucket "$BUCKET_NAME" \
  --key "$EXTERNAL_KEY"
```

### 26.3. Condición del ejercicio

El bucket principal no tiene versionado habilitado.
No generalices esta eliminación a un bucket con versiones.
No uses un vaciado recursivo en lugar de esta operación específica.

### 26.4. Evidencia

Registra bucket, clave y resultado.
No elimines manualmente el objeto que gestiona Terraform.

---

## 27. Comprobar el contenido restante

La eliminación debe acompañarse de una consulta posterior.

### 27.1. Consultar

```bash
aws_local s3api list-objects-v2 \
  --bucket "$BUCKET_NAME" \
  > evidencias/objetos-tras-limpieza-externa.json
```

### 27.2. Verificar ausencia de la clave externa

```bash
jq -e --arg key "$EXTERNAL_KEY" '
  [(.Contents // [])[] | .Key] | index($key) == null
' evidencias/objetos-tras-limpieza-externa.json
```

### 27.3. Interpretación

El objeto declarativo debe permanecer.
La comprobación no demuestra ausencia de versiones históricas.
En este laboratorio no se habilitó versionado.
Un listado fallido no constituye prueba de limpieza.

---

## 28. Aplicar una destrucción revisada

Genera un plan nuevo después de la limpieza externa.

### 28.1. Guardar y revisar

```bash
terraform plan -destroy -out=destruccion.tfplan
terraform show destruccion.tfplan
```

### 28.2. Ejecutar después de decidir

```bash
terraform apply destruccion.tfplan
```

### 28.3. Confirmación importante

Aplicar un plan guardado no solicita la confirmación interactiva habitual.
La decisión debe tomarse antes del comando.
No confíes en una pregunta posterior que no aparecerá.

### 28.4. Protección

El plan puede contener información sensible.
No lo publiques.
Si cambia el entorno o la configuración, revisa si necesitas generar otro.

---

## 29. Verificar ausencia de recursos

La limpieza necesita comprobar el estado y la API.

### 29.1. Estado

```bash
terraform state list
```

### 29.2. API

```bash
aws_local s3api list-buckets \
  > evidencias/buckets-finales.json

jq -e --arg bucket "$BUCKET_NAME" '
  [.Buckets[].Name] | index($bucket) == null
' evidencias/buckets-finales.json
```

### 29.3. Interpretación

La consulta de API debe haber terminado correctamente.
La coincidencia se comprueba por nombre exacto.
Otros buckets pueden pertenecer a otros proyectos.

### 29.4. Límite

Un estado sin recursos no significa que debas borrar el archivo de estado.

---

## 30. Retirar el proyecto Compose

Retira el emulador únicamente después de comprobar la limpieza.

### 30.1. Comando principal

```bash
docker compose down
```

### 30.2. Qué comprobar después

```bash
docker compose ps --all
docker compose ls
```

### 30.3. Alcance

Las consultas deben interpretarse con el mismo proyecto y contexto.
No concluyas que Docker completo está vacío.
Otros proyectos pueden seguir funcionando.

### 30.4. Seguridad

No añadas opciones de retirada de volúmenes sin revisarlos.
No uses limpieza global de Docker.
El cierre de una práctica no autoriza borrar recursos ajenos.

---

## 31. Reiniciar un servicio sin limpiar

Un reinicio operativo tiene un objetivo diferente.

### 31.1. Comando

```bash
docker compose restart localstack
```

### 31.2. Uso adecuado

Puede ser útil para investigar un proceso bloqueado.
No equivale a eliminar recursos declarativos.
No garantiza conservar ni eliminar todos los datos emulados.

### 31.3. Cambios de configuración

El reinicio no aplica por sí solo todas las modificaciones de Compose.
Cambios de puertos o variables pueden requerir otra operación.
Consulta el procedimiento de la versión utilizada.

### 31.4. Regla

Después de reiniciar, consulta las APIs.
No presupongas continuidad del laboratorio únicamente porque el contenedor volvió a ejecutarse.

---

## 32. Detener y volver a iniciar

Detención y arranque permiten gestionar el proceso sin una retirada completa.

### 32.1. Comandos

```bash
docker compose stop localstack
docker compose start localstack
```

### 32.2. Interpretación

`start` actúa sobre contenedores existentes.
No crea necesariamente un servicio retirado mediante `down`.
Para una nueva creación, utiliza el procedimiento de `up`.

### 32.3. Datos

La conservación de datos depende de configuración y comportamiento del emulador.
No prometas persistencia por conservar un contenedor.
Comprueba recursos y propiedades tras volver a iniciar.

### 32.4. Contexto educativo

Este procedimiento es una pausa operativa.
No sustituye la limpieza final de la sesión.

---

## 33. Repetir el laboratorio desde una base limpia

El reinicio didáctico conserva código y vuelve a desplegar.

### 33.1. Arrancar otra vez

```bash
docker compose up -d
docker compose ps
aws_local s3api list-buckets
```

### 33.2. Desplegar

```bash
terraform plan
terraform apply
```

### 33.3. Resultado esperado

El plan debe proponer los recursos que fueron destruidos.
El código y las dependencias siguen disponibles.
No necesitas borrar el estado limpio para volver a crear.

### 33.4. Verificación

Consulta bucket y objeto gestionado.
El objeto externo no se recrea automáticamente.
Solo reaparece si repites su operación de CLI.

---

## 34. Volúmenes y persistencia

La persistencia exige una revisión independiente del ciclo de recursos.

### 34.1. Tipos de almacenamiento

Puedes encontrar:

- Capa de escritura del contenedor.
- Volumen con nombre.
- Volumen anónimo.
- Montaje de un directorio del anfitrión.

### 34.2. Diferencias relevantes

Retirar un contenedor elimina su capa de escritura.
Un volumen puede permanecer.
Un directorio del anfitrión tiene un ciclo de vida independiente.

### 34.3. Persistencia de LocalStack

Montar almacenamiento no demuestra que todos los servicios persistan correctamente.
La función puede depender de versión, modalidad y configuración.
Consulta la documentación correspondiente.

### 34.4. Regla

Esta práctica principal no utiliza persistencia explícita.
No añadas almacenamiento durante la limpieza.

---

## 35. Retirada de volúmenes autorizados

Eliminar datos persistentes requiere identificar el alcance exacto.

### 35.1. Investigación previa

Consulta la configuración efectiva.
Identifica montajes y nombres.
Comprueba qué proyecto utiliza cada volumen.
Obtén autorización antes de eliminar.

### 35.2. Particularidad de Compose

La opción de retirada de volúmenes de `down` afecta a volúmenes administrados según sus reglas.
Los volúmenes externos no se retiran como volúmenes ordinarios del proyecto.
Un montaje del anfitrión tampoco equivale a un volumen administrado.

### 35.3. Riesgo

Los datos eliminados pueden ser irrecuperables.
No utilices una opción de volumen como receta universal de reinicio.
No borres carpetas del anfitrión por semejanza de nombres.

### 35.4. Entregable

Una ampliación de persistencia debe registrar volumen, propiedad y decisión de conservación.

---

## 36. Buckets con versionado

La limpieza de un bucket versionado necesita operaciones diferentes.

### 36.1. Diferencia esencial

Eliminar una clave sin indicar versión puede crear un marcador de eliminación.
Las versiones anteriores pueden permanecer.
Un listado de objetos actuales no muestra necesariamente todo el historial.

### 36.2. Consulta de investigación

Solo para un bucket del ejercicio autorizado:

```bash
aws_local s3api list-object-versions \
  --bucket "$BUCKET_NAME"
```

### 36.3. Qué revisar

Busca versiones y marcadores de eliminación.
Comprueba indicadores de paginación.
No interpretes una página como inventario completo.

### 36.4. Alcance

Esta unidad no proporciona un borrador masivo de versiones.
La actividad requiere compatibilidad comprobada y una lista de elementos autorizados.

---

## 37. Eliminación de versiones específicas

Una versión debe identificarse antes de eliminarla.

### 37.1. Fragmento condicionado

Tras asignar una clave y una versión observadas:

```bash
aws_local s3api delete-object \
  --bucket "$BUCKET_NAME" \
  --key "$AUTHORIZED_KEY" \
  --version-id "$AUTHORIZED_VERSION_ID"
```

### 37.2. Condiciones

Ambas variables deben proceder del inventario autorizado.
No ejecutes el fragmento con valores vacíos o supuestos.
Un marcador de eliminación también necesita tratamiento específico.

### 37.3. Comprobación

Consulta de nuevo el historial.
Considera todas las páginas.
La eliminación puede ser irreversible.

### 37.4. Regla

No conviertas este fragmento en una iteración indiscriminada sobre un bucket compartido.

---

## 38. Fallos y destrucciones parciales

Terraform puede completar unas operaciones y fallar en otras.

### 38.1. Ejemplo habitual

El objeto declarativo desaparece.
El bucket permanece porque contiene un objeto externo.
El estado puede reflejar la parte completada.

### 38.2. Procedimiento

Consulta el estado actual.
Consulta la API.
Identifica el bloqueo.
Elimina únicamente el elemento externo autorizado.
Genera un nuevo plan de destrucción.

### 38.3. Qué evitar

No reutilices ciegamente un plan anterior.
No borres el estado.
No elimines toda la carpeta del proyecto.
No cambies `force_destroy` para ocultar el problema.

### 38.4. Evidencia

Documenta operaciones completadas, recurso pendiente y recuperación.

---

## 39. Emulador perdido y estado existente

Una recreación inesperada puede dejar el estado desalineado con el entorno.

### 39.1. Situación

El archivo de estado conserva relaciones antiguas.
La API nueva puede no contener los recursos.
También podrías estar consultando otra instancia por error.

### 39.2. Investigación

Confirma endpoint, puerto, contexto Docker y proyecto Compose.
Comprueba credenciales ficticias coherentes.
Consulta los nombres registrados.

### 39.3. Recuperación prudente

Si el entorno fue restablecido, un plan puede detectar recursos ausentes.
La siguiente decisión depende de si deseas recrear o cerrar el ejercicio.
Revisa la propuesta antes de aplicar.

### 39.4. Regla

No declares perdido el recurso hasta confirmar el destino.
No utilices comandos de estado como sustituto de la investigación.

---

## 40. Bloqueos, workspaces y comandos de estado

Estas herramientas requieren comprender el alcance seleccionado.

### 40.1. Workspace

Comprueba:

```bash
terraform workspace show
terraform workspace list
```

Un workspace puede seleccionar otro estado.
No constituye una barrera universal de seguridad.

### 40.2. Bloqueo

No fuerces un desbloqueo mientras otra operación pueda estar activa.
Investiga propietario, proceso y backend.
Un bloqueo es una protección, no un archivo molesto.

### 40.3. Comandos de estado

Retirar una relación del estado no destruye el recurso real.
Los movimientos y sustituciones necesitan un procedimiento específico.
No uses `state rm` como comando habitual de limpieza.

---

## 41. Automatizar comprobaciones, no borrados indiscriminados

La automatización inicial comprobará ausencia por nombre.

### 41.1. Archivo `scripts/verificar-limpieza.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT"
source scripts/cliente-local.sh

BUCKET_NAME=$(jq -er '.bucket | strings | select(length > 0)' \
  evidencias/identificadores.json)

TMP_DIR=$(mktemp -d)
trap 'rm -rf -- "$TMP_DIR"' EXIT

aws_local s3api list-buckets > "$TMP_DIR/buckets.json"
jq -e --arg bucket "$BUCKET_NAME" '
  [.Buckets[].Name] | index($bucket) == null
' "$TMP_DIR/buckets.json" >/dev/null

printf 'Bucket del ejercicio ausente: %s\n' "$BUCKET_NAME"
```

---

## 42. Sesiones prácticas para el alumnado

Las sesiones combinan ejecución, interpretación y revisión por parejas.

### 42.1. Sesión A: limpieza completa

Duración orientativa: 45 minutos.
Despliega bucket y objeto gestionado.
Añade el objeto externo.
Compara estado y API.
Elimina la clave externa, destruye y verifica.
Entrega inventario, plan revisado y evidencia final.

### 42.2. Sesión B: repetir la práctica

Duración orientativa: 25 minutos.
Retira Compose después de limpiar.
Arranca, despliega y comprueba otra vez.
Explica qué archivos conservaste y por qué.

### 42.3. Sesión C: diagnóstico por parejas

Duración orientativa: 30 minutos.
Analiza un caso de bucket no vacío o endpoint incorrecto.
Propón comprobaciones antes de operaciones.
Entrega una hipótesis descartada mediante evidencia.

---

## 43. Ejercicios, diferencias y evaluación

La evaluación exige decisiones fundamentadas, no una lista de comandos.

### 43.1. Ejercicios de análisis

Explica por qué detener Docker no equivale a destruir infraestructura.
Distingue una clave actual y una versión histórica.
Describe el riesgo de cambiar el proyecto Compose.
Justifica por qué debe conservarse el estado durante la limpieza.

### 43.2. Diferencias respecto a AWS real

AWS real requiere identidad, autorización y control de costes.
Las restricciones de borrado pueden incluir políticas, retenciones y protecciones adicionales.
LocalStack no garantiza reproducir todos esos comportamientos.
La eliminación real puede afectar a datos irrecuperables.

### 43.3. Evaluación

Valora alcance, revisión, verificación, recuperación y documentación.
Una operación no autorizada es un fallo crítico.
Una puntuación alta no compensa la exposición de secretos.
La conclusión debe corresponder a lo observado.

---

## 44. Registro, protección y resumen

El cierre debe permitir entender lo eliminado y repetir lo conservado.

### 44.1. Registro mínimo

Conserva fecha, versiones, endpoint, contexto Docker y proyecto Compose.
Anota recursos, claves, comandos y resultados.
Distingue expectativas, hechos observados y aspectos pendientes.
Documenta cualquier fallo parcial y su recuperación.

### 44.2. Protección

No publiques estados, planes, tokens ni logs sensibles.
Conserva configuración y archivo de bloqueo.
Revisa evidencias antes de compartirlas.
No uses limpieza global de Docker para cerrar una práctica.

### 44.3. Ideas esenciales

Destruye recursos antes de retirar el emulador.
Elimina objetos externos solo cuando estén identificados y autorizados.
Comprueba estado y API; no confundas reinicio con restablecimiento.
**Limpiar correctamente significa eliminar lo previsto, conservar lo necesario y demostrar ambas cosas.**