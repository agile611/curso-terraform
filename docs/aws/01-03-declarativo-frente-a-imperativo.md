# Declarativo frente a imperativo: comprender y practicar con Terraform y LocalStack

> Curso de Terraform con LocalStack emulando servicios de AWS.
> Todas las operaciones de esta lección se realizan en un entorno local.
> No utilices credenciales reales de AWS.
> Una prueba satisfactoria en LocalStack no demuestra equivalencia completa con AWS.

Esta lección explica dos formas de expresar una tarea técnica: indicar acciones o describir resultados.
El enfoque imperativo se centra en los pasos que deben ejecutarse.
El enfoque declarativo se centra en el estado que se desea alcanzar.
Ambos pueden ser útiles, pero plantean preguntas distintas sobre repetición, cambios y recuperación.

Trabajaremos con dos buckets S3 locales.
Uno se gestionará mediante comandos de AWS CLI.
El otro se gestionará mediante una configuración de Terraform.
La comparación permitirá observar diferencias sin mezclar la propiedad de los recursos.

El objetivo no es demostrar que una herramienta siempre supera a otra.
El objetivo es elegir procedimientos comprensibles, verificables y adecuados para cada tarea.
Cada práctica incluirá una intención, una observación y una interpretación.

---

## 1. Objetivos de aprendizaje

Esta unidad conecta conceptos de programación con operaciones de infraestructura.

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Definir el enfoque imperativo.
- Definir el enfoque declarativo.
- Diferenciar una instrucción de un estado deseado.
- Explicar qué significa converger.
- Reconocer el papel del estado de Terraform.
- Distinguir idempotencia, repetibilidad y reproducibilidad.

### 1.2. Objetivos prácticos

También podrás:

- Crear un recurso mediante comandos.
- Crear otro recurso mediante Terraform.
- Comparar una segunda ejecución.
- Revisar un cambio antes de aplicarlo.
- Detectar una modificación externa.
- Limpiar cada recurso con su procedimiento correspondiente.

### 1.3. Evidencia final

Entregarás código, comandos y observaciones.
La evidencia debe mostrar qué ocurrió realmente.
No basta con afirmar que un procedimiento es mejor.

---

## 2. Alcance de la lección

La comparación utiliza recursos sencillos para concentrarse en el modelo de trabajo.

### 2.1. Recursos utilizados

El laboratorio incluye:

- Un bucket llamado `aula-imperativo-001`.
- Un bucket llamado `aula-declarativo-001`.
- Etiquetas de clasificación.
- Consultas de verificación.
- Un objeto ficticio opcional.

### 2.2. Componentes del entorno

Utilizaremos:

- Terraform CLI.
- El provider de AWS.
- AWS CLI.
- Docker Compose.
- LocalStack.
- Una terminal Bash.

### 2.3. Restricciones

No se utilizarán recursos de AWS real.
No se configurarán políticas IAM.
No se implementará un backend remoto.
No se introducirán secretos.
No se gestionará el mismo bucket con dos procedimientos simultáneos.

---

## 3. Requisitos previos

Comprueba las herramientas antes de iniciar los ejercicios.

### 3.1. Conocimientos recomendados

Debes saber:

- Crear directorios.
- Editar archivos.
- Ejecutar comandos.
- Leer mensajes de error.
- Identificar un endpoint.
- Diferenciar un archivo de un servicio.

### 3.2. Herramientas necesarias

Prepara:

- Terraform compatible con la configuración.
- Docker en funcionamiento.
- Docker Compose.
- AWS CLI.
- Un editor de texto.
- Bash.

### 3.3. Sistemas operativos

Los ejemplos de terminal utilizan Bash.
En Windows puedes emplear WSL.
No pegues funciones Bash directamente en PowerShell.
Adapta rutas únicamente después de comprender su función.

---

## 4. Versiones y compatibilidad

Una práctica reproducible necesita registrar sus dependencias.

### 4.1. Base didáctica

La configuración utilizará:

- Terraform desde 1.6 y anterior a 2.0.
- Provider de AWS dentro de la serie 5.
- Una etiqueta concreta de LocalStack.

Estas elecciones son una referencia del ejemplo.
No se presentan como las versiones más recientes.
Tampoco se afirma que esta página haya ejecutado y validado la combinación.

### 4.2. Comprobación inicial

```bash
terraform version
docker version
docker compose version
aws --version
```

### 4.3. Responsabilidad del curso

El docente debe probar la combinación elegida.
El alumnado debe registrar las versiones utilizadas.
Si cambia una versión, deben repetirse las comprobaciones relevantes.

---

## 5. Primera aproximación: acciones y resultados

La diferencia puede entenderse antes de hablar de infraestructura.

### 5.1. Ejemplo imperativo

Una instrucción imperativa podría decir:

```text
Abre el documento.
Busca el título.
Selecciona el texto.
Aplica negrita.
Guarda el documento.
```

### 5.2. Ejemplo declarativo

Una descripción declarativa podría decir:

```text
El documento debe tener un título destacado en negrita.
```

### 5.3. Diferencia observable

El primer texto indica una secuencia.
El segundo indica una condición final.
La condición final necesita una herramienta o persona que decida cómo alcanzarla.
Describir el resultado no elimina la necesidad de ejecutar acciones.

---

## 6. Qué significa trabajar de forma imperativa

El enfoque imperativo expresa operaciones concretas.

### 6.1. Características habituales

Un procedimiento imperativo especifica:

- Qué acción se ejecuta.
- Con qué parámetros.
- En qué momento.
- Con qué condiciones previas.
- Qué hacer si aparece un error.

### 6.2. Ejemplo de infraestructura

```text
Crear un bucket.
Añadir tres etiquetas.
Subir un archivo.
Consultar el contenido.
Eliminar el archivo.
Eliminar el bucket.
```

### 6.3. Papel del estado inicial

El mismo comando puede comportarse de forma distinta según el entorno.
Crear un recurso inexistente no es igual que intentar crearlo otra vez.
El autor del procedimiento debe considerar esas diferencias.
La secuencia por sí sola no garantiza una recuperación correcta.

---

## 7. Qué significa trabajar de forma declarativa

El enfoque declarativo describe propiedades que deberían mantenerse.

### 7.1. Ejemplo de infraestructura

```text
Debe existir un bucket con este nombre.
Debe tener estas etiquetas.
Debe estar gestionado por esta configuración.
```

### 7.2. Qué decide la herramienta

La herramienta compara información disponible.
Después determina operaciones compatibles con la configuración.
Puede proponer creaciones, actualizaciones o destrucciones.
También puede encontrar situaciones que requieren intervención.

### 7.3. Lo que no desaparece

Siguen siendo necesarios:

- Permisos.
- Conectividad.
- APIs disponibles.
- Revisión.
- Gestión de errores.
- Comprobaciones del resultado.

---

## 8. Comparación general de los enfoques

La tabla presenta tendencias, no garantías universales.

### 8.1. Diferencias principales

| **Aspecto** | **Imperativo** | **Declarativo** |
|-------------|----------------|-----------------|
| Foco | Operaciones | Estado deseado |
| Secuencia | Normalmente explícita | Derivada de relaciones |
| Repetición | Depende del procedimiento | Depende de reconciliación y provider |
| Cambio | Se programa una acción | Se modifica una declaración |
| Diagnóstico | Pasos y resultados | Configuración, estado y observación |

Ambos enfoques necesitan controles.
Ninguno garantiza por sí solo seguridad o corrección.

### 8.2. Interpretación importante

Un script imperativo puede comprobar el estado antes de actuar.
Una herramienta declarativa puede ejecutar operaciones peligrosas.
La clasificación describe el modelo de expresión.
No sustituye la evaluación de cada implementación.

### 8.3. Pregunta de reflexión

Explica por qué declarativo no significa automático y seguro.
Utiliza un ejemplo de eliminación de recursos.

---

## 9. Los comandos de Terraform también son imperativos

Conviene separar el lenguaje de configuración de las operaciones de la herramienta.

### 9.1. Operaciones explícitas

Estos comandos solicitan acciones:

```bash
terraform init
terraform plan
terraform apply
terraform destroy
```

### 9.2. Configuración declarativa

Los bloques de recursos describen propiedades deseadas.
No constituyen una lista de comandos ejecutados de arriba abajo.
Terraform utiliza relaciones y lógica del provider para proponer operaciones.

### 9.3. Dos niveles diferentes

En esta lección distinguiremos:

- El procedimiento operativo del usuario.
- El modelo de configuración de los recursos.

Ejecutar `terraform apply` es una acción explícita.
El contenido aplicado puede seguir siendo declarativo.
No existe contradicción entre ambos niveles.

---

## 10. Estado deseado, estado registrado y estado observado

Terraform necesita relacionar información procedente de distintas fuentes.

### 10.1. Estado deseado

Es la intención expresada en los archivos de configuración.
Puede incluir valores calculados mediante expresiones.
No es necesariamente una descripción exhaustiva de todos los atributos del servicio.

### 10.2. Estado registrado

Es la información que Terraform conserva para gestionar recursos.
Permite relacionar direcciones de configuración con objetos.
Puede contener atributos obtenidos durante consultas o aplicaciones.
Puede incluir información sensible.

### 10.3. Estado observado

Es la información obtenida del servicio durante las operaciones.
Depende de APIs, permisos y comportamiento del provider.
No es una fotografía universal de toda la infraestructura.

### 10.4. Consecuencia práctica

Un recurso puede existir sin estar registrado en Terraform.
Un recurso registrado puede haber desaparecido.
La siguiente planificación ayuda a descubrir diferencias dentro de su alcance.

---

## 11. Convergencia, idempotencia y reproducibilidad

Estos términos describen propiedades relacionadas, pero diferentes.

### 11.1. Convergencia

Converger significa aproximarse al estado deseado.
Una aplicación correcta puede reducir diferencias.
Una planificación posterior puede mostrar que no hay nuevos cambios.

### 11.2. Idempotencia

Una operación idempotente mantiene el mismo efecto relevante al repetirse.
No significa que siempre devuelva la misma salida.
Tampoco significa que nunca realice consultas.

### 11.3. Repetibilidad

Un procedimiento repetible puede ejecutarse nuevamente siguiendo las mismas instrucciones.
Su resultado depende de condiciones conocidas.
Debe documentar qué presupone sobre el entorno.

### 11.4. Reproducibilidad

Una práctica reproducible permite obtener resultados comparables en otro entorno preparado.
Requiere versiones, entradas y condiciones documentadas.
Ninguna de estas propiedades queda garantizada simplemente por escribir HCL.

---

## 12. Dependencias y orden de ejecución

Terraform utiliza relaciones, no el orden visual de los archivos.

### 12.1. Idea fundamental

Los archivos `.tf` de un módulo se interpretan conjuntamente.
Un archivo llamado `01-bucket.tf` no obliga a crear primero su contenido.
Los nombres ayudan a organizar el proyecto.
No establecen por sí solos la secuencia de operaciones.

### 12.2. Referencias entre recursos

Una expresión puede utilizar un atributo de otro recurso.
Esa referencia permite inferir una dependencia.
Terraform utiliza estas relaciones para construir un grafo.

### 12.3. Dependencias explícitas

`depends_on` permite expresar ciertas dependencias no inferidas mediante referencias.
No debe utilizarse para sustituir referencias normales sin necesidad.
Un uso excesivo puede ampliar dependencias y valores desconocidos.

### 12.4. Actividad conceptual

Dibuja dos recursos y una flecha de dependencia.
Explica cuál necesita información del otro.
Después distingue dependencia técnica de preferencia de lectura.

---

## 13. Arquitectura del laboratorio

Separaremos las operaciones de ambos enfoques sobre el mismo servicio local.

### 13.1. Flujo de trabajo

```text
AWS CLI ────────────────┐
                       ├── LocalStack ── S3 local
Terraform ── Provider ──┘
```

### 13.2. Separación de recursos

AWS CLI gestionará `aula-imperativo-001`.
Terraform gestionará `aula-declarativo-001`.
No declararemos el bucket imperativo en Terraform.
No eliminaremos manualmente el bucket declarativo durante el flujo principal.

### 13.3. Motivo de la separación

La comparación necesita resultados distinguibles.
Gestionar el mismo objeto con dos fuentes de intención puede crear conflictos.
Las operaciones externas sobre el bucket declarativo solo se usarán en la práctica de drift.
Esas operaciones se documentarán expresamente.

---

## 14. Preparación del proyecto

Utiliza un directorio exclusivo para esta unidad.

### 14.1. Crear carpetas

```bash
mkdir -p declarativo-imperativo/evidencias
cd declarativo-imperativo
```

### 14.2. Estructura prevista

```text
declarativo-imperativo/
├── compose.yaml
├── versions.tf
├── providers.tf
├── main.tf
├── outputs.tf
├── .gitignore
├── .terraform.lock.hcl
└── evidencias/
    └── registro.md
```

### 14.3. Regla de revisión

Comprueba que no existen archivos `.tf` de otras prácticas.
Terraform los incluiría en la configuración.
No copies estados procedentes de otros proyectos.
Registra siempre el directorio desde el que ejecutas comandos.

---

## 15. Arranque de LocalStack

El ejemplo utiliza únicamente los servicios necesarios para la lección.

### 15.1. Archivo `compose.yaml`

La etiqueta es una referencia didáctica concreta.
Sustitúyela por la combinación probada por el curso cuando corresponda.

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

### 15.2. Iniciar y consultar

```bash
docker compose config
docker compose up -d
docker compose ps
docker compose logs --tail=60 localstack
```

### 15.3. Condiciones del ejemplo

No se configura persistencia explícita.
No se monta el socket de Docker.
El docente debe comprobar los requisitos de autenticación de la imagen y edición elegidas.

---

## 16. Conexión local mediante AWS CLI

La función siguiente concentra las opciones de conexión del ejercicio.

### 16.1. Definir la función en Bash

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

### 16.2. Consultar S3

```bash
aws_local s3api list-buckets
```

### 16.3. Precauciones

La función utiliza credenciales ficticias.
Debes volver a definirla en una terminal nueva.
No sustituuyas una conexión local fallida por un endpoint de AWS.

---

## 17. Práctica imperativa: crear el bucket

Comenzaremos con instrucciones directas sobre la API local.

### 17.1. Comprobar el entorno inicial

```bash
aws_local s3api list-buckets
```

Comprueba que el nombre del ejercicio no está ocupado.
Si el entorno es compartido, utiliza nombres acordados por el docente.
No elimines recursos de otro equipo.

### 17.2. Crear el recurso

```bash
aws_local s3api create-bucket \
  --bucket aula-imperativo-001
```

### 17.3. Añadir etiquetas

```bash
aws_local s3api put-bucket-tagging \
  --bucket aula-imperativo-001 \
  --tagging '{"TagSet":[{"Key":"Curso","Value":"Terraform"},{"Key":"Enfoque","Value":"Imperativo"}]}'
```

### 17.4. Interpretación

Has ejecutado dos operaciones distintas.
La creación no demuestra que la segunda operación haya terminado correctamente.
Cada paso necesita su propia comprobación.

---

## 18. Verificación del procedimiento imperativo

La consulta debe confirmar las propiedades que intentaste establecer.

### 18.1. Comprobar existencia

```bash
aws_local s3api head-bucket \
  --bucket aula-imperativo-001
```

Una finalización correcta puede no mostrar contenido.
Consulta el código de salida inmediatamente si necesitas registrarlo.

### 18.2. Comprobar etiquetas

```bash
aws_local s3api get-bucket-tagging \
  --bucket aula-imperativo-001
```

### 18.3. Evidencias esperadas

El bucket debe responder a la consulta.
Las etiquetas deben incluir `Curso` y `Enfoque`.
La propiedad `Enfoque` debe tener el valor `Imperativo`.

### 18.4. Registro

Anota el comando y el resultado relevante.
No atribuyas a la creación las propiedades establecidas posteriormente.
Distingue existencia de configuración.

---

## 19. Segunda ejecución del procedimiento imperativo

Repetir permite estudiar supuestos sobre el estado inicial.

### 19.1. Repetir la creación

```bash
aws_local s3api create-bucket \
  --bucket aula-imperativo-001
```

### 19.2. Qué observar

Registra:

- Si el comando termina correctamente.
- Si devuelve un error.
- Qué mensaje presenta.
- Si aparece otro bucket.
- Qué propiedades conserva el recurso.

### 19.3. Interpretación prudente

No se presupone un error idéntico en todos los entornos.
La recreación de nombres existentes depende del servicio y del emulador.
AWS también tiene particularidades regionales para determinadas operaciones S3.
Utiliza el resultado real, no una respuesta memorizada.

### 19.4. Conclusión provisional

Una secuencia imperativa simple necesita definir cómo tratar recursos existentes.
La siguiente sección incorpora esa condición de forma explícita.

---

## 20. Procedimiento imperativo con comprobaciones

Un script puede incorporar observación antes de actuar.

### 20.1. Ejemplo de control condicional

Con LocalStack previamente verificado y la función definida:

```bash
if aws_local s3api head-bucket \
  --bucket aula-imperativo-001
then
  printf 'El bucket ya responde a la consulta.\n'
else
  printf 'La consulta falló; revisa el error antes de crear.\n'
fi
```

### 20.2. Por qué no crear automáticamente en `else`

Una consulta fallida no demuestra siempre ausencia.
Puede indicar conectividad, permisos o un error del servicio.
El procedimiento debe distinguir esas situaciones.
Crear ante cualquier error puede ocultar el diagnóstico.

### 20.3. Discusión

Añadir condiciones mejora el script.
También introduce lógica que debe mantenerse.
El enfoque sigue siendo imperativo porque especifica cómo decidir y actuar.
No se convierte en declarativo solo por evitar una creación duplicada.

---

## 21. Actualización imperativa de etiquetas

Modificar un recurso requiere formular otra operación.

### 21.1. Añadir una etiqueta al conjunto

```bash
aws_local s3api put-bucket-tagging \
  --bucket aula-imperativo-001 \
  --tagging '{"TagSet":[{"Key":"Curso","Value":"Terraform"},{"Key":"Enfoque","Value":"Imperativo"},{"Key":"Practica","Value":"Actualizacion"}]}'
```

### 21.2. Semántica importante

`put-bucket-tagging` establece el conjunto de etiquetas.
No debes interpretarlo como añadir una etiqueta aislada conservando cualquier otra automáticamente.
Para conservar valores, debes incluirlos o implementar una combinación previa.
La intención del script debe reflejar esa semántica.

### 21.3. Verificar

```bash
aws_local s3api get-bucket-tagging \
  --bucket aula-imperativo-001
```

### 21.4. Pregunta de análisis

¿Qué ocurriría si el comando incluyera únicamente `Practica`?
Comprueba la respuesta en el bucket de esta práctica si el docente lo autoriza.

---

## 22. Preparación declarativa con Terraform

Ahora describiremos otro bucket mediante archivos HCL.

### 22.1. Archivo `versions.tf`

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

### 22.2. Interpretación

La versión de Terraform y la del provider son distintas.
La restricción del provider permite selecciones dentro de la serie 5.
La inicialización registrará una selección en el archivo de bloqueo.

### 22.3. Disciplina del laboratorio

No utilices `terraform init -upgrade` sin un motivo registrado.
Conserva `.terraform.lock.hcl`.
No confundas el bloqueo del provider con el bloqueo de todas las herramientas.
La imagen de LocalStack requiere su propia referencia.

---

## 23. Provider local para la configuración declarativa

Terraform debe dirigirse al mismo emulador utilizado por AWS CLI.

### 23.1. Archivo `providers.tf`

```hcl
provider "aws" {
  region     = "us-east-1"
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

### 23.2. Límites

Las opciones `skip_*` no son una barrera de red.
Solo se configuran endpoints para los servicios indicados.
Añadir otros recursos exige revisar sus destinos.
Terraform debe ejecutarse en el equipo anfitrión para usar este `localhost`.

---

## 24. Declaración del estado deseado

El recurso expresa propiedades, no una secuencia de creación y etiquetado.

### 24.1. Archivo `main.tf`

```hcl
resource "aws_s3_bucket" "declarativo" {
  bucket        = "aula-declarativo-001"
  force_destroy = false

  tags = {
    Curso   = "Terraform"
    Enfoque = "Declarativo"
  }
}
```

### 24.2. Lectura del bloque

El tipo es `aws_s3_bucket`.
La etiqueta local es `declarativo`.
El nombre del bucket es `aula-declarativo-001`.
Las etiquetas forman parte de la intención.

### 24.3. Dirección del recurso

```text
aws_s3_bucket.declarativo
```

### 24.4. Protección limitada

`force_destroy = false` evita solicitar el vaciado automático mediante este recurso.
No impide eliminar un bucket vacío.

---

## 25. Salidas y exclusiones del proyecto

Selecciona información útil y evita publicar archivos sensibles.

### 25.1. Archivo `outputs.tf`

```hcl
output "bucket_declarativo" {
  description = "Nombre del bucket gestionado por Terraform."
  value       = aws_s3_bucket.declarativo.bucket
}
```

### 25.2. Archivo `.gitignore`

```gitignore
.terraform/
*.tfstate
*.tfstate.*
*.tfplan
*.tfvars
*.tfvars.json
crash.log
```

### 25.3. Precaución

El estado y los planes pueden contener información sensible.
Un archivo ignorado puede seguir registrado si ya estaba en Git.
No publiques estados para demostrar que la práctica funciona.
Utiliza evidencias saneadas y consultas relevantes.

---

## 26. Inicialización, validación y primer plan

Estas operaciones preparan y revisan la configuración antes de crear recursos.

### 26.1. Ejecutar comprobaciones

```bash
terraform init
terraform fmt
terraform validate
terraform plan
```

### 26.2. Qué demuestra cada operación

`init` prepara dependencias.
`fmt` organiza el formato.
`validate` comprueba aspectos de la configuración.
`plan` propone operaciones utilizando configuración e información disponible.

### 26.3. Qué buscar en el plan

Localiza `aws_s3_bucket.declarativo`.
Identifica el nombre del bucket.
Comprueba las etiquetas previstas.
Marca atributos conocidos después de aplicar.

### 26.4. Alcance esperado

En un estado limpio, se espera crear el bucket declarativo.
El bucket imperativo no debería aparecer como recurso gestionado.
Si aparece otra operación, detente y revisa el directorio.

---

## 27. Aplicación declarativa y verificación independiente

Aplicar ejecuta la propuesta aprobada, pero la comprobación sigue siendo necesaria.

### 27.1. Aplicar

```bash
terraform apply
```

Lee el plan antes de confirmar.
No utilices `-auto-approve` en esta sesión.
Una confirmación sin revisión no demuestra comprensión.

### 27.2. Consultar Terraform

```bash
terraform output
terraform state list
```

### 27.3. Consultar el servicio local

```bash
aws_local s3api head-bucket \
  --bucket aula-declarativo-001

aws_local s3api get-bucket-tagging \
  --bucket aula-declarativo-001
```

### 27.4. Interpretación

El estado y la API aportan evidencias diferentes.
Ambas deben corresponder al mismo nombre.

---

## 28. Segunda ejecución declarativa

La segunda planificación permite estudiar convergencia.

### 28.1. Generar otro plan

```bash
terraform plan
```

### 28.2. Resultado esperado

Si no hay diferencias relevantes, se espera una propuesta sin cambios.
Terraform puede realizar consultas aunque no proponga modificaciones.
No debes confundir ausencia de cambios con ausencia de trabajo.

### 28.3. Comparación con el procedimiento imperativo

El comando de creación imperativo solicitaba una operación concreta.
La planificación declarativa evalúa si hacen falta operaciones.
La diferencia está en el modelo de decisión.
No demuestra que cualquier comando imperativo sea inadecuado.

### 28.4. Evidencia

Conserva el resumen del plan.
Explica por qué no se propone crear un segundo bucket.
Relaciona configuración, estado y recurso observado.
Anota cualquier diferencia inesperada.

---

## 29. Actualización declarativa de etiquetas

Modificar la intención sustituye a programar una llamada concreta.

### 29.1. Cambiar el mapa `tags`

Añade:

```hcl
Practica = "Actualizacion"
```

### 29.2. Revisar y aplicar

```bash
terraform fmt
terraform validate
terraform plan
terraform apply
```

### 29.3. Comprobar

```bash
aws_local s3api get-bucket-tagging \
  --bucket aula-declarativo-001
```

### 29.4. Comparación

En el enfoque imperativo escribiste otra operación de etiquetado.
Aquí modificaste una propiedad deseada.
El provider determina las llamadas necesarias.
La revisión del plan sigue siendo responsabilidad del equipo.

---

## 30. Drift: una modificación externa controlada

Esta práctica muestra una desviación entre configuración y recurso observado.

### 30.1. Modificar mediante AWS CLI

Solo sobre el bucket declarativo del ejercicio:

```bash
aws_local s3api put-bucket-tagging \
  --bucket aula-declarativo-001 \
  --tagging '{"TagSet":[{"Key":"Enfoque","Value":"CambioExterno"}]}'
```

### 30.2. Generar un plan

```bash
terraform plan
```

### 30.3. Preguntas de observación

¿Qué valores aparecen en el archivo?
¿Qué valores devuelve ahora la API?
¿Qué cambios propone Terraform?
¿Qué herramienta produjo la desviación?

### 30.4. Interpretación

El cambio externo no modifica automáticamente los archivos HCL.
El plan puede proponer recuperar las etiquetas declaradas.
No apliques hasta decidir cuál es la intención correcta.
La detección depende del provider y de los atributos gestionados.

---

## 31. Recuperar la intención declarada

La recuperación debe ser una decisión consciente.

### 31.1. Decisión del laboratorio

En esta sesión queremos conservar la configuración HCL.
Por tanto, aceptaremos los cambios que recuperan sus etiquetas.
En otro contexto podría ser necesario modificar la configuración.
No todas las diferencias deben corregirse aplicando automáticamente.

### 31.2. Aplicar y comprobar

```bash
terraform apply

aws_local s3api get-bucket-tagging \
  --bucket aula-declarativo-001

terraform plan
```

### 31.3. Resultado esperado

Las etiquetas deben coincidir con la intención.
El siguiente plan debería dejar de proponer esa corrección.
Si no ocurre, registra la diferencia y revisa el comportamiento observado.

### 31.4. Lección

Declarativo facilita expresar qué conservar.
No elimina la necesidad de decidir ante un cambio externo legítimo.

---

## 32. Eliminación declarativa y destrucción explícita

Terraform ofrece distintas formas de expresar que un recurso deje de existir.

### 32.1. Quitar un recurso de la configuración

Si eliminas un bloque gestionado y generas un plan, puede proponerse destruir el recurso.
Editar el archivo no ejecuta esa destrucción inmediatamente.
La operación requiere una aplicación posterior.

### 32.2. Destrucción del conjunto gestionado

```bash
terraform plan -destroy
```

Este plan propone destruir los recursos gestionados por el estado correspondiente.
No selecciona todos los buckets existentes en LocalStack.
El bucket imperativo no debería incluirse.

### 32.3. Precaución

No realices todavía la destrucción si quedan ejercicios pendientes.
Comprueba el directorio y el estado antes de continuar.
No borres el estado para fingir una limpieza correcta.

### 32.4. Pregunta de reflexión

¿Por qué retirar un bloque puede tener consecuencias destructivas?
Explica el papel de la relación registrada en el estado.

---

## 33. Objetos S3 y propiedad de los recursos

Un recurso contenedor y su contenido pueden tener ciclos de vida distintos.

### 33.1. Crear contenido ficticio opcional

```bash
printf 'Archivo ficticio de la leccion.\n' > mensaje.txt

aws_local s3api put-object \
  --bucket aula-imperativo-001 \
  --key ejercicios/mensaje.txt \
  --body mensaje.txt
```

### 33.2. Consultar el contenido

```bash
aws_local s3api list-objects-v2 \
  --bucket aula-imperativo-001
```

### 33.3. Interpretación

El objeto se ha creado mediante una llamada imperativa.
No aparece en el estado de Terraform.
Declarar un bucket no significa gestionar automáticamente todos sus objetos.

### 33.4. Consecuencia de limpieza

Un bucket con contenido puede impedir una eliminación ordinaria.
Debe revisarse y vaciarse de forma deliberada.

---

## 34. Fallos parciales y recuperación

Ambos enfoques pueden completar unas operaciones y fallar en otras.

### 34.1. Caso imperativo

La creación del bucket termina correctamente.
La operación de etiquetado falla.
El recurso existe, pero no cumple toda la intención.
Repetir ciegamente la secuencia puede producir resultados confusos.

### 34.2. Caso declarativo

Una aplicación puede crear algunos recursos y fallar posteriormente.
No debe asumirse una reversión completa.
Terraform registra resultados de las operaciones que consigue completar.
La recuperación requiere observar y generar otro plan.

### 34.3. Secuencia prudente

1. Conserva el mensaje saneado.
2. Consulta el servicio.
3. Revisa el estado cuando corresponda.
4. Identifica qué falta.
5. Corrige la causa.
6. Revisa la siguiente operación.

### 34.4. Límite importante

Una aplicación no debe entenderse como una transacción universal sobre toda la infraestructura.

---

## 35. Límites de la automatización declarativa

La declaración no cubre necesariamente todos los aspectos de un sistema.

### 35.1. Cobertura del provider

El provider gestiona determinados tipos y atributos.
Puede haber capacidades de la API no expuestas todavía.
También puede haber diferencias entre versiones.
Consulta el esquema y la documentación de la versión utilizada.

### 35.2. Atributos calculados

Algunos valores se obtienen del servicio.
Otros dependen de recursos todavía no creados.
Un valor desconocido no debe sustituirse por una suposición.

### 35.3. Controles excepcionales

Opciones como `ignore_changes` pueden alterar qué diferencias se corrigen.
`prevent_destroy` introduce una protección dentro de determinadas condiciones.
Ninguna debe añadirse sin explicar su alcance.
No constituyen por sí solas un sistema completo de gobierno.

### 35.4. Mensaje esencial

Declarativo expresa intención.
El comportamiento final depende de configuración, herramienta, provider y API.

---

## 36. Diferencias respecto a AWS real

La comparación local enseña procedimientos, no reproduce todas las condiciones operativas.

### 36.1. Tabla de límites

| **Aspecto** | **LocalStack** | **AWS real** |
|-------------|----------------|--------------|
| Identidad | Credenciales de práctica | Identidades y permisos reales |
| Destino | API local | Endpoints administrados |
| Costes | Uso del equipo | Facturación de servicios |
| Compatibilidad | Según versión y edición | Comportamiento del servicio |
| Operación | Entorno educativo | Responsabilidad productiva |

Las diferencias deben figurar en las conclusiones.
No son detalles opcionales.

### 36.2. Particularidades de S3

La existencia de buckets y ciertas respuestas pueden variar.
El comportamiento ante nombres existentes debe observarse.
La emulación de permisos no debe asumirse completa.

### 36.3. Transición futura

Una práctica en AWS requiere autorización, límites de costes y permisos.
No consiste simplemente en quitar los endpoints locales.

---

## 37. Diagnóstico y resolución de problemas

Un diagnóstico útil diferencia síntomas de causas.

### 37.1. Comprobaciones iniciales

| **Síntoma** | **Primera comprobación** | **Acción que evitar** |
|-------------|--------------------------|----------------------|
| Conexión rechazada | Contenedor y puerto | Cambiar a AWS real |
| Bucket inesperado | Entorno compartido | Borrarlo sin autorización |
| Plan inesperado | Archivos y estado | Aplicar automáticamente |
| Etiquetas distintas | Última herramienta usada | Atribuirlo a Terraform sin evidencia |
| Destrucción fallida | Contenido del bucket | Forzar sin revisión |

La tabla orienta el siguiente paso.
No confirma una causa.

### 37.2. Registro mínimo

Anota comando, versión y mensaje.
Formula una hipótesis comprobable.
Cambia una condición relevante.
Repite y compara.

### 37.3. Regla docente

Resolver el error importa.
Explicar por qué se resolvió también forma parte del aprendizaje.

---

## 38. Sesión práctica A: comparar creación y repetición

La primera sesión reúne los procedimientos básicos.

### 38.1. Duración y objetivo

Duración orientativa: 45 minutos.
Objetivo: comparar una creación directa con una reconciliación declarativa.

### 38.2. Distribución

- Preparación: 10 minutos.
- Creación imperativa: 10 minutos.
- Creación declarativa: 15 minutos.
- Comparación: 10 minutos.

La descarga inicial de herramientas puede necesitar tiempo adicional.
Debe realizarse antes de la sesión si la conectividad es limitada.

### 38.3. Trabajo del alumnado

Crea ambos buckets.
Comprueba sus etiquetas.
Repite la solicitud imperativa.
Genera un segundo plan declarativo.
Documenta diferencias.

### 38.4. Entregable

Entrega una tabla con operación, resultado y explicación.
Añade una limitación de la comparación.

---

## 39. Sesión práctica B: modificar y recuperar

La segunda sesión observa cambios de intención y cambios externos.

### 39.1. Duración y objetivo

Duración orientativa: 35 minutos.
Objetivo: distinguir actualización deliberada de drift.

### 39.2. Actividades

1. Añade `Practica` al bucket imperativo.
2. Añade `Practica` al bloque declarativo.
3. Comprueba ambos resultados.
4. Modifica externamente el bucket declarativo.
5. Genera un plan.
6. Recupera la intención tras revisarlo.

### 39.3. Trabajo por parejas

Una persona ejecuta.
La otra interpreta antes de confirmar.
Después intercambian funciones.
Ambas deben poder explicar las operaciones.

### 39.4. Entregable

Entrega una cronología.
Indica qué herramienta produjo cada cambio.
Incluye la decisión tomada ante el drift.

---

## 40. Sesión práctica C: diagnosticar un fallo parcial

La tercera sesión trabaja recuperación y evidencias.

### 40.1. Duración y objetivo

Duración orientativa: 25 minutos.
Objetivo: proponer una recuperación sin ejecutar pasos arbitrarios.

### 40.2. Caso ficticio

```text
La creación del bucket finalizó correctamente.
La operación de etiquetas devolvió un error.
Un compañero propone borrar todo y empezar.
No se ha consultado todavía el recurso.
```

### 40.3. Actividades

Identifica qué se sabe.
Identifica qué no se sabe.
Propón dos consultas.
Explica cuándo repetirías una operación.
Distingue una hipótesis de un diagnóstico confirmado.

### 40.4. Entregable

Redacta un procedimiento de recuperación de cinco pasos.
No incluyas eliminación como respuesta automática.
Justifica cada comprobación con la incertidumbre que resuelve.

---

## 41. Ejercicios de refuerzo

Estos ejercicios consolidan vocabulario y lectura de configuraciones.

### 41.1. Clasificación de instrucciones

Clasifica y justifica:

- Crear un bucket con un comando.
- Mantener un bucket con determinadas etiquetas.
- Ejecutar `terraform apply`.
- Comprobar existencia antes de crear.
- Declarar una referencia entre recursos.

### 41.2. Lectura de Terraform

Explica por qué el orden de archivos no impone el orden de creación.
Diferencia nombre del bucket y dirección de Terraform.
Describe la función del archivo de bloqueo.

### 41.3. Diseño de procedimientos

Escribe una intención declarativa para un laboratorio.
Después redacta un procedimiento imperativo que intente alcanzarla.
Incluye condiciones previas y comprobaciones.

### 41.4. Comparación crítica

Indica una tarea donde usarías comandos directos.
Indica otra donde preferirías Terraform.
Justifica la elección sin afirmar superioridad universal.

---

## 42. Uso responsable de asistentes de inteligencia artificial

Un asistente puede ayudar a revisar conceptos y resultados saneados.

### 42.1. Prompt de comparación

```text
Compara estos dos procedimientos ficticios.
Uno utiliza comandos de AWS CLI.
El otro declara un recurso de Terraform.
Identifica intención, condiciones previas y comprobaciones.
No ejecutes acciones.
No atribuyas seguridad automática al enfoque declarativo.
Distingue hechos observados de resultados esperados.
```

### 42.2. Qué verificar

Comprueba que no confunda LocalStack con AWS.
Revisa que interprete correctamente las etiquetas.
Marca afirmaciones sobre idempotencia que necesiten matices.
No aceptes comandos destructivos sin revisión.

### 42.3. Datos permitidos

Utiliza fragmentos ficticios.
No adjuntes estados reales.
No publiques planes binarios.
Registra qué correcciones comprobaste personalmente.

---

## 43. Limpieza controlada de los recursos

Cada recurso debe eliminarse mediante un procedimiento identificado.

### 43.1. Eliminar el objeto opcional

```bash
aws_local s3api delete-object \
  --bucket aula-imperativo-001 \
  --key ejercicios/mensaje.txt
```

### 43.2. Eliminar el bucket imperativo

Comprueba primero que está vacío:

```bash
aws_local s3api list-objects-v2 \
  --bucket aula-imperativo-001

aws_local s3api delete-bucket \
  --bucket aula-imperativo-001
```

### 43.3. Eliminar el bucket declarativo

```bash
terraform plan -destroy
terraform destroy
```

Revisa el alcance antes de confirmar.
No debería incluir el bucket imperativo.

---

## 44. Verificación final y detención del entorno

La limpieza debe comprobarse antes de cerrar la práctica.

### 44.1. Consultar recursos restantes

```bash
terraform state list
aws_local s3api list-buckets
```

### 44.2. Resultado esperado

Terraform no debería listar recursos gestionados de esta práctica.
S3 no debería incluir los dos buckets del ejercicio.
En un entorno compartido pueden quedar recursos de otros equipos.
No los elimines.

### 44.3. Detener el servicio

Si la instancia es exclusiva de tu proyecto:

```bash
docker compose down
```

### 44.4. Distinción importante

Detener LocalStack no equivale a destruir mediante Terraform.
Sin persistencia, recrear el servicio puede producir divergencias con el estado.
No borres el estado para ocultar una limpieza pendiente.
Conserva únicamente las evidencias autorizadas.

---

## 45. Evaluación de la práctica

La evaluación combina comprensión, funcionamiento y controles.

### 45.1. Rúbrica inicial

Valora cada criterio entre cero y dos puntos.

| **Criterio** | **0 puntos** | **1 punto** | **2 puntos** |
|-------------|--------------|-------------|-------------|
| Conceptos | Confunde enfoques | Explicación parcial | Distingue con ejemplos |
| Ejecución | No completa | Necesita ajustes | Completa y registra |
| Verificación | Sin evidencias | Evidencias parciales | Consultas coherentes |
| Seguridad | Ignora límites | Cumplimiento parcial | Respeta controles |
| Interpretación | Opiniones sin apoyo | Apoyo incompleto | Conclusiones fundamentadas |

Una puntuación alta no compensa una ejecución no autorizada.
Los fallos críticos se tratan por separado.

### 45.2. Criterio esencial

El alumno debe explicar sus resultados.
Copiar comandos no demuestra comprensión.
La documentación debe permitir revisar lo ocurrido.
Las limitaciones deben quedar visibles.

---

## 46. Registro de aprendizaje

Documentar permite reutilizar procedimientos y detectar supuestos.

### 46.1. Plantilla breve

```markdown
# Registro de la comparación
## Fecha y versiones
## Arquitectura y endpoint
## Intención del ejercicio
## Procedimiento imperativo
## Configuración declarativa
## Primera ejecución
## Segunda ejecución
## Modificación y drift
## Errores y recuperación
## Limpieza verificada
## Limitaciones
```

### 46.2. Calidad del registro

Conserva comandos exactos.
Separa resultados observados y esperados.
No reconstruyas mensajes de memoria.
No guardes secretos.
Añade referencias a los archivos utilizados.

---

## 47. Comprobación final de comprensión

Responde con tus palabras y con ejemplos del laboratorio.

### 47.1. Preguntas esenciales

1. ¿Qué describe un procedimiento imperativo?
2. ¿Qué describe una configuración declarativa?
3. ¿Por qué los comandos de Terraform son acciones explícitas?
4. ¿Qué relación existe entre configuración y estado?
5. ¿Por qué una segunda ejecución puede no modificar nada?
6. ¿Qué significa drift?
7. ¿Por qué una consulta fallida no demuestra ausencia?
8. ¿Qué límites introduce LocalStack?

### 47.2. Caso de aplicación

Un compañero modifica etiquetas desde AWS CLI.
Después Terraform propone cambiarlas.
Explica por qué ambos resultados pueden ser coherentes.
Identifica qué decisión humana falta.

### 47.3. Autoevaluación

Puedo distinguir intención de operación.
Puedo revisar un plan.
Puedo comprobar un recurso independientemente.
Puedo explicar una recuperación sin borrar todo.

---

## 48. Resumen y siguientes pasos

La diferencia entre enfoques está en cómo se expresa y mantiene la intención.

### 48.1. Ideas que debes conservar

- Imperativo indica operaciones.
- Declarativo describe propiedades deseadas.
- Los scripts pueden incorporar comprobaciones.
- Terraform necesita estado y observación.
- Un plan sin cambios no es una auditoría.
- Una aplicación puede fallar parcialmente.
- La emulación local tiene límites.
- La limpieza necesita evidencias.

### 48.2. Continuación del curso

Las siguientes unidades pueden desarrollar variables y expresiones.
Después conviene estudiar dependencias, módulos y organización de proyectos.
El trabajo colaborativo requiere abordar backends y bloqueo.
La transición a AWS real necesita identidad, permisos y control de costes.

### 48.3. Cierre

**Describe la intención, revisa las operaciones y comprueba el resultado.**
La automatización es más útil cuando sus supuestos quedan visibles.
Aprender Terraform significa comprender también lo que la herramienta no garantiza.