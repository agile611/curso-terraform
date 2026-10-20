# SQS: colas y dead-letter queues con Terraform y LocalStack

Amazon SQS permite intercambiar mensajes entre componentes sin exigir que productores y consumidores trabajen al mismo tiempo.

Una cola recibe mensajes, los mantiene disponibles y los entrega a consumidores.

El consumidor debe procesar cada mensaje y confirmar su finalización mediante una operación de eliminación.

Si el procesamiento falla repetidamente, una dead-letter queue puede aislar el mensaje para su investigación.

Terraform permite declarar estas colas y configurar sus relaciones.

LocalStack permite practicar las operaciones mediante una emulación local de las API de AWS.

En esta lección construirás una cola principal y una cola de mensajes fallidos.

Después practicarás publicación, recepción, eliminación, reintentos y recuperación.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.

---

## 1. Objetivos de aprendizaje

Esta lección combina infraestructura declarativa y operaciones de mensajería.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Crear una cola estándar con Terraform.
- Crear una dead-letter queue compatible.
- Configurar políticas de redirección.
- Diferenciar URL, ARN y nombre de una cola.
- Publicar y recibir mensajes.
- Utilizar correctamente un receipt handle.
- Comprender el tiempo de visibilidad.
- Observar reintentos y mensajes fallidos.
- Recuperar mensajes sin ocultar riesgos de duplicación.
- Destruir el laboratorio de forma controlada.

### 1.2. Resultado práctico

Construirás dos colas y comprobarás el recorrido de un mensaje fallido.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos básicos de Terraform.

### 2.1. Herramientas

Comprueba:

```bash
terraform version
docker version
docker compose version
aws --version
jq --version
```

El laboratorio utiliza Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se limita a la serie 5.x como base didáctica.

### 2.2. Conocimientos recomendados

Debes reconocer recursos, variables, outputs, referencias y planes guardados.

Los comandos utilizan una terminal compatible con Bash.

Terraform y AWS CLI se ejecutan en el host.

---

## 3. Compatibilidad del laboratorio

El docente debe validar la combinación concreta antes de distribuir la práctica.

### 3.1. Operaciones que deben comprobarse

Verifica en la imagen y edición elegidas:

- Creación y consulta de colas.
- Publicación y recepción de mensajes.
- Eliminación mediante receipt handle.
- Cambio de visibilidad.
- Configuración de `RedrivePolicy`.
- Configuración de `RedriveAllowPolicy`.
- Transferencia automática a la DLQ.
- Eliminación de colas.

### 3.2. Registro de versiones

Conserva la versión de Terraform y `.terraform.lock.hcl`.

Documenta la imagen o digest de LocalStack.

No presupongas compatibilidad completa por utilizar solamente SQS.

---

## 4. Qué es una cola

Una cola desacopla la publicación de mensajes de su procesamiento.

### 4.1. Productor

El productor publica un mensaje.

No necesita esperar a que el consumidor complete el trabajo.

### 4.2. Consumidor

El consumidor solicita mensajes y procesa los que recibe.

Después elimina aquellos cuyo procesamiento terminó correctamente.

### 4.3. Flujo conceptual

```text
Productor → Cola principal → Consumidor
```

### 4.4. Consecuencia

La cola permite absorber diferencias temporales entre publicación y procesamiento.

No sustituye la lógica de negocio del consumidor.

---

## 5. Qué es un mensaje

Un mensaje contiene un cuerpo y puede incluir atributos adicionales.

### 5.1. Componentes habituales

Puedes encontrar:

- `Body`.
- `MessageId`.
- Atributos del mensaje.
- Atributos de sistema.
- Un receipt handle cuando se recibe.

### 5.2. Ejemplo de cuerpo

```json
{
  "event_id": "pedido-001",
  "event_type": "order.created",
  "order_id": "order-001"
}
```

### 5.3. Responsabilidad

SQS transporta el cuerpo.

No valida automáticamente el contrato de negocio de ese JSON.

---

## 6. Identificadores de una cola

Cada identificador tiene una función diferente.

### 6.1. Comparación

| **Identificador** | **Uso principal** | **Ejemplo conceptual** |
|-------------------|-------------------|------------------------|
| Nombre | Crear o localizar la cola | `curso-sqs-main-alumno01` |
| URL | Operaciones de mensajes | URL devuelta por SQS |
| ARN | Políticas y relaciones entre recursos | ARN devuelto por SQS |
| Dirección Terraform | Identificar el recurso en el estado | `aws_sqs_queue.main` |

No utilices el ARN donde una operación requiere `QueueUrl`.

### 6.2. Regla del laboratorio

Obtendremos URL y ARN desde outputs.

No construiremos identificadores manualmente.

### 6.3. LocalStack

El formato de las URL puede variar según la estrategia de endpoints configurada.

---

## 7. Colas estándar y FIFO

La elección afecta a las garantías y a los argumentos utilizados.

### 7.1. Comparación

| **Tipo** | **Características principales** | **Uso orientativo** |
|----------|---------------------------------|--------------------|
| Estándar | Entrega al menos una vez y orden de mejor esfuerzo | Trabajo desacoplado de alto rendimiento |
| FIFO | Orden dentro de grupos y controles de deduplicación | Procesos que necesitan secuencia por entidad |

Esta práctica utiliza colas estándar.

### 7.2. Duplicados

Un consumidor de una cola estándar debe tolerar mensajes duplicados.

### 7.3. Orden

No presupongas que los mensajes se recibirán en el mismo orden de publicación.

### 7.4. Compatibilidad de DLQ

Una cola estándar necesita una DLQ estándar.

Una cola FIFO necesita una DLQ FIFO.

---

## 8. Entrega y eliminación

Recibir un mensaje no equivale a completar su procesamiento.

### 8.1. Secuencia correcta

```text
Recibir → Validar → Procesar → Eliminar
```

### 8.2. Fallo de procesamiento

Si el procesamiento falla, normalmente no se elimina el mensaje.

Cuando vuelve a estar visible, puede recibirse otra vez.

### 8.3. Riesgo

Eliminar antes de completar el trabajo puede provocar pérdida lógica del evento.

### 8.4. Regla

La eliminación representa una confirmación de procesamiento.

SQS no interpreta el resultado de tu aplicación.

---

## 9. Receipt handle

El receipt handle identifica una recepción concreta de un mensaje.

### 9.1. Diferencia principal

`MessageId` identifica el mensaje publicado.

`ReceiptHandle` permite operar sobre una entrega recibida.

### 9.2. Uso

Necesitas el receipt handle para:

- Eliminar el mensaje.
- Cambiar su visibilidad.

### 9.3. Renovación

Una nueva recepción puede entregar un receipt handle diferente.

### 9.4. Precaución

Utiliza siempre el handle de la recepción más reciente.

No diseñes un consumidor suponiendo que un handle antiguo continúa siendo válido.

---

## 10. Tiempo de visibilidad

El tiempo de visibilidad oculta temporalmente un mensaje recibido.

### 10.1. Objetivo

Evitar que otros consumidores reciban inmediatamente el mismo mensaje.

### 10.2. Durante el procesamiento

El mensaje permanece en vuelo.

No se considera eliminado.

### 10.3. Al finalizar el tiempo

Si no se ha eliminado, puede volver a estar disponible.

### 10.4. Límite

La visibilidad no constituye un bloqueo transaccional perfecto.

Un consumidor sigue necesitando tolerancia a duplicados.

---

## 11. Elegir la visibilidad

La duración debe corresponder al trabajo real.

### 11.1. Demasiado corta

El mensaje puede volver a entregarse mientras el primer consumidor todavía trabaja.

### 11.2. Demasiado larga

Un fallo puede retrasar innecesariamente el siguiente intento.

### 11.3. Trabajo variable

Un consumidor puede ampliar la visibilidad durante operaciones largas.

### 11.4. Laboratorio

Utilizaremos valores cortos para observar el comportamiento.

No copies esos tiempos a producción sin medir el procesamiento.

### 11.5. Regla

Relaciona visibilidad, duración del trabajo y estrategia de reintentos.

---

## 12. Retención de mensajes

La retención determina cuánto tiempo puede conservarse un mensaje.

### 12.1. Diferencia respecto a visibilidad

Visibilidad controla cuándo puede volver a recibirse.

Retención limita cuánto tiempo permanece almacenado.

### 12.2. Expiración

Un mensaje puede expirar aunque ningún consumidor lo haya procesado correctamente.

### 12.3. DLQ

Una DLQ también tiene retención.

### 12.4. Recomendación

En colas estándar, configura una retención de DLQ mayor que la de la cola principal.

### 12.5. Laboratorio

La principal tendrá un día y la DLQ catorce días.

---

## 13. Long polling

Long polling permite esperar mensajes durante una solicitud de recepción.

### 13.1. Ventaja

Reduce respuestas vacías y consultas repetidas innecesarias.

### 13.2. Argumento de AWS CLI

```bash
--wait-time-seconds 5
```

### 13.3. Configuración de cola

```hcl
receive_wait_time_seconds = 10
```

### 13.4. Precedencia

Una solicitud puede establecer su propio tiempo de espera.

### 13.5. Precaución

El timeout HTTP del cliente debe permitir la espera solicitada.

---

## 14. Qué es una dead-letter queue

Una DLQ recibe mensajes que superan el umbral de recepciones configurado.

### 14.1. Flujo conceptual

```text
Productor → Cola principal → Intentos de procesamiento
                                  ↓
                                 DLQ
```

### 14.2. Propósito

Aislar mensajes que necesitan investigación o intervención.

### 14.3. Ejemplos de causas

- JSON inválido.
- Datos incompatibles.
- Error permanente de negocio.
- Dependencia externa indisponible.
- Tiempo de procesamiento mal configurado.

### 14.4. Límite

La DLQ no identifica por sí sola cuál fue la causa del fallo.

---

## 15. `maxReceiveCount`

Este parámetro establece el umbral de recepciones antes de la redirección.

### 15.1. Ejemplo del laboratorio

```json
{
  "maxReceiveCount": 3
}
```

### 15.2. Interpretación

El servicio utiliza las recepciones para determinar cuándo corresponde trasladar el mensaje.

### 15.3. No es un contador de excepciones

SQS no observa directamente cuántas veces falló tu código.

Observa el ciclo de recepción y disponibilidad del mensaje.

### 15.4. Precaución

No presupongas el instante exacto de transferencia a partir de una sola llamada.

La práctica utilizará observación acotada y consultas posteriores.

---

## 16. Dos políticas diferentes

La relación entre cola principal y DLQ utiliza políticas con funciones distintas.

### 16.1. Comparación

| **Política** | **Ubicación** | **Responsabilidad** |
|--------------|---------------|--------------------|
| `RedrivePolicy` | Cola principal | Elegir DLQ y umbral de recepciones |
| `RedriveAllowPolicy` | DLQ | Restringir qué colas pueden utilizarla |
| Política de acceso de cola | Cola correspondiente | Autorizar operaciones sobre SQS |

No confundas redirección con permisos generales de acceso.

### 16.2. Laboratorio

La principal apuntará al ARN de la DLQ.

La DLQ permitirá únicamente a la cola principal configurada.

### 16.3. AWS real

También debes revisar IAM y las políticas de recursos correspondientes.

---

## 17. Terraform y los mensajes

Terraform gestionará la infraestructura, no el procesamiento de cada mensaje.

### 17.1. Recursos gestionados

Declararemos:

- Cola principal.
- DLQ.
- Política de redirección.
- Política de autorización de redirección.

### 17.2. Datos de práctica

AWS CLI publicará y consumirá los mensajes.

### 17.3. Estado

El estado no constituye un historial de todos los mensajes enviados.

### 17.4. Consecuencia

Un plan sin cambios no demuestra que las colas estén vacías.

---

## 18. Preparación del directorio

Trabaja en una carpeta independiente de otras lecciones.

### 18.1. Crear estructura

```bash
mkdir -p terraform-sqs-localstack/planes
mkdir -p terraform-sqs-localstack/mensajes
mkdir -p terraform-sqs-localstack/resultados
cd terraform-sqs-localstack
```

### 18.2. Archivos principales

```text
terraform-sqs-localstack/
├── compose.yaml
├── .env
├── versions.tf
├── providers.tf
├── variables.tf
├── terraform.tfvars
├── main.tf
└── outputs.tf
```

---

## 19. Protección de archivos

Mantén separados configuración, mensajes ficticios y artefactos operativos.

### 19.1. `.gitignore`

```gitignore
.terraform/
*.tfstate
*.tfstate.*
*.tfplan
.env
planes/
resultados/
crash.log
```

### 19.2. Qué conservar

Versiona la configuración, los mensajes ficticios y `.terraform.lock.hcl`.

### 19.3. Precaución

No publiques estados o resultados que contengan mensajes reales sensibles.

---

## 20. Selección de LocalStack

Utiliza la imagen validada por el docente.

### 20.1. Referencia

Sustituye el marcador antes de continuar:

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 20.2. Reproducibilidad

Utiliza una etiqueta fija o un digest.

### 20.3. Alcance

La práctica necesita únicamente SQS.

### 20.4. Advertencia

No presupongas que cualquier edición o versión implementa todas las operaciones de redirección.

---

## 21. Docker Compose y URL de cola

La configuración debe devolver URL utilizables desde el host.

### 21.1. `compose.yaml`

```yaml
services:
  localstack:
    image: ${LOCALSTACK_IMAGE:?Define LOCALSTACK_IMAGE}
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: sqs
      AWS_DEFAULT_REGION: us-east-1
      SQS_ENDPOINT_STRATEGY: path
```

### 21.2. Arranque

```bash
docker compose up -d
docker compose ps
```

### 21.3. Verificación

Comprueba que la imagen elegida admite esta estrategia de endpoints.

---

## 22. Credenciales ficticias y conectividad

Configura AWS CLI en la terminal actual.

### 22.1. Variables

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
```

### 22.2. Consulta inicial

```bash
aws \
  --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  sqs list-queues
```

### 22.3. Continuación

Espera una respuesta válida antes de desplegar Terraform.

---

## 23. Requisitos y proveedor

Crea los archivos de conexión.

### 23.1. `versions.tf`

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

### 23.2. `providers.tf`

```hcl
provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    sqs = "http://localhost:4566"
  }
}
```

---

## 24. Variables del laboratorio

Crea `variables.tf`.

### 24.1. Declaraciones

```hcl
variable "suffix" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.suffix))
    error_message = "Usa entre 4 y 8 caracteres alfanuméricos."
  }
}

variable "max_receive_count" {
  type    = number
  default = 3

  validation {
    condition = (
      var.max_receive_count >= 1 &&
      var.max_receive_count <= 10 &&
      var.max_receive_count == floor(var.max_receive_count)
    )
    error_message = "El laboratorio admite enteros entre 1 y 10."
  }
}
```

---

## 25. Colas principal y de mensajes fallidos

Crea `main.tf`.

### 25.1. Recursos

```hcl
resource "aws_sqs_queue" "dlq" {
  name                      = "curso-sqs-dlq-${var.suffix}"
  message_retention_seconds = 1209600

  tags = {
    Laboratory = "LocalStack"
    Role       = "DeadLetterQueue"
  }
}

resource "aws_sqs_queue" "main" {
  name                       = "curso-sqs-main-${var.suffix}"
  visibility_timeout_seconds = 10
  message_retention_seconds  = 86400
  receive_wait_time_seconds  = 10

  tags = {
    Laboratory = "LocalStack"
    Role       = "MainQueue"
  }
}
```

---

## 26. Políticas de redirección

Añade los recursos al mismo archivo.

### 26.1. Configuración

```hcl
resource "aws_sqs_queue_redrive_allow_policy" "dlq" {
  queue_url = aws_sqs_queue.dlq.id

  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue"
    sourceQueueArns   = [aws_sqs_queue.main.arn]
  })
}

resource "aws_sqs_queue_redrive_policy" "main" {
  queue_url = aws_sqs_queue.main.id

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = var.max_receive_count
  })

  depends_on = [
    aws_sqs_queue_redrive_allow_policy.dlq
  ]
}
```

---

## 27. Entradas, outputs y dependencias

Crea los archivos restantes.

### 27.1. `terraform.tfvars`

```hcl
suffix            = "alumno01"
max_receive_count = 3
```

### 27.2. `outputs.tf`

```hcl
output "main_queue_url" {
  value = aws_sqs_queue.main.id
}

output "dlq_queue_url" {
  value = aws_sqs_queue.dlq.id
}

output "queue_arns" {
  value = {
    main = aws_sqs_queue.main.arn
    dlq  = aws_sqs_queue.dlq.arn
  }
}
```

### 27.3. Justificación

La dependencia explícita configura primero la autorización de redirección.

---

## 28. Sesión 1: desplegar la infraestructura

Duración orientativa: 20 minutos.

### 28.1. Secuencia

```bash
terraform init
terraform fmt -recursive
terraform validate
terraform plan -out=planes/create.tfplan
terraform show planes/create.tfplan
terraform apply planes/create.tfplan
```

### 28.2. Resultado esperado

Deben crearse cuatro recursos Terraform.

En SQS existirán dos colas.

### 28.3. Variables de terminal

```bash
MAIN_URL="$(terraform output -raw main_queue_url)"
DLQ_URL="$(terraform output -raw dlq_queue_url)"
```

---

## 29. Sesión 2: verificar la configuración remota

Consulta los atributos mediante AWS CLI.

### 29.1. Cola principal

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  sqs get-queue-attributes \
  --queue-url "$MAIN_URL" \
  --attribute-names All \
  > resultados/main-attributes.json
```

### 29.2. DLQ

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  sqs get-queue-attributes \
  --queue-url "$DLQ_URL" \
  --attribute-names All \
  > resultados/dlq-attributes.json
```

### 29.3. Lectura

Utiliza `jq` y `fromjson` para examinar las políticas almacenadas como cadenas JSON.

---

## 30. Sesión 3: publicar un mensaje correcto

Prepara un evento ficticio.

### 30.1. `mensajes/correcto.json`

```json
{
  "event_id": "evento-correcto-001",
  "event_type": "order.created",
  "order_id": "order-001",
  "simulate_failure": false
}
```

### 30.2. Publicación

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  sqs send-message \
  --queue-url "$MAIN_URL" \
  --message-body file://mensajes/correcto.json \
  > resultados/send-correct.json
```

### 30.3. Comprobación

Examina `MessageId` con `jq`.

---

## 31. Sesión 4: recibir y procesar el mensaje

La recepción no elimina el mensaje.

### 31.1. Solicitud

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  sqs receive-message \
  --queue-url "$MAIN_URL" \
  --max-number-of-messages 1 \
  --wait-time-seconds 5 \
  --visibility-timeout 30 \
  --message-system-attribute-names All \
  > resultados/receive-correct.json
```

### 31.2. Lectura

```bash
jq '.Messages[]? | {MessageId, Body, Attributes}' \
  resultados/receive-correct.json
```

### 31.3. Validación

Comprueba que el cuerpo corresponde al evento correcto antes de eliminarlo.

---

## 32. Sesión 5: confirmar mediante eliminación

Utiliza el handle recibido, no el identificador de publicación.

### 32.1. Capturar handle

```bash
RECEIPT="$(jq -er '.Messages[0].ReceiptHandle' resultados/receive-correct.json)"
```

### 32.2. Eliminar

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  sqs delete-message \
  --queue-url "$MAIN_URL" \
  --receipt-handle "$RECEIPT"
```

### 32.3. Precaución

Si no recibiste ningún mensaje, no continúes con un handle vacío.

### 32.4. Entregable

Explica por qué `MessageId` no sirve para esta operación.

---

## 33. Sesión 6: observar la visibilidad

Publica otro mensaje correcto y no lo elimines inmediatamente.

### 33.1. Recepción

Recíbelo con `--visibility-timeout 10`.

Guarda el resultado en `resultados/visibility.json`.

### 33.2. Segunda consulta

Solicita mensajes inmediatamente con una espera breve.

El mensaje recién recibido normalmente permanecerá oculto.

### 33.3. Espera

Espera más de diez segundos y vuelve a recibir.

### 33.4. Finalización

Elimina el mensaje utilizando el handle de la recepción más reciente.

### 33.5. Límite

La ausencia en una única consulta no demuestra que la cola esté vacía.

---

## 34. Sesión 7: cambiar la visibilidad de una recepción

Un consumidor puede ajustar el tiempo disponible para trabajar.

### 34.1. Patrón de operación

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  sqs change-message-visibility \
  --queue-url "$MAIN_URL" \
  --receipt-handle "$RECEIPT" \
  --visibility-timeout 20
```

### 34.2. Requisito

`RECEIPT` debe corresponder a una recepción actual todavía válida.

### 34.3. Liberación inmediata

Un valor cero permite que el mensaje vuelva a estar disponible.

### 34.4. Precaución

No ejecutes este ejemplo con el handle de un mensaje ya eliminado.

---

## 35. Sesión 8: preparar un mensaje fallido

Antes de empezar, termina o elimina los mensajes de las sesiones anteriores.

### 35.1. `mensajes/fallido.json`

```json
{
  "event_id": "evento-fallido-001",
  "event_type": "order.created",
  "order_id": "order-invalid",
  "simulate_failure": true
}
```

### 35.2. Publicación

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  sqs send-message --queue-url "$MAIN_URL" \
  --message-body file://mensajes/fallido.json \
  > resultados/send-failed.json
```

### 35.3. Simulación

El consumidor de práctica no eliminará este mensaje.

---

## 36. Sesión 9: provocar reintentos de forma acotada

El siguiente bucle es una herramienta didáctica, no un consumidor de producción.

### 36.1. Recepciones repetidas

```bash
FOUND_DLQ=false

for attempt in $(seq 1 12); do
  aws --endpoint-url=http://localhost:4566 --region us-east-1 \
    sqs receive-message --queue-url "$MAIN_URL" \
    --max-number-of-messages 1 --wait-time-seconds 1 \
    --visibility-timeout 0 \
    --message-system-attribute-names All \
    > resultados/retry.json

  jq -r '.Messages[]? |
    "Recepción: \(.MessageId), contador: \(.Attributes.ApproximateReceiveCount)"' \
    resultados/retry.json
```

### 36.2. Continuación

Completa el mismo bucle con el fragmento de la sección siguiente.

---

## 37. Sesión 9: observar la llegada a la DLQ

La observación debe considerar transferencia y disponibilidad asíncronas.

### 37.1. Segunda parte del bucle

```bash
  aws --endpoint-url=http://localhost:4566 --region us-east-1 \
    sqs receive-message --queue-url "$DLQ_URL" \
    --max-number-of-messages 1 --wait-time-seconds 1 \
    --visibility-timeout 120 \
    --message-system-attribute-names All \
    > resultados/dlq-receive.json

  if jq -e '.Messages[0] != null' resultados/dlq-receive.json >/dev/null; then
    FOUND_DLQ=true
    break
  fi

  sleep 1
done

printf 'Mensaje observado en DLQ: %s\n' "$FOUND_DLQ"
```

### 37.2. Seguridad

El bucle no elimina mensajes de ninguna de las dos colas.

---

## 38. Interpretar el experimento de reintentos

El resultado debe explicarse mediante observación, no mediante una cuenta rígida de llamadas.

### 38.1. Resultado esperado

El mensaje fallido debe terminar disponible en la DLQ.

### 38.2. Contador

`ApproximateReceiveCount` ayuda a observar recepciones.

No representa un registro de excepciones de aplicación.

### 38.3. Si no se observa transferencia

Revisa políticas, tiempos, versión de LocalStack y mensajes pendientes.

Consulta nuevamente después de una espera.

### 38.4. Precaución

Una respuesta vacía no demuestra una transferencia correcta.

### 38.5. Entregable

Conserva el cuerpo recibido en la DLQ y verifica su `event_id`.

---

## 39. Inspección de mensajes fallidos

La DLQ necesita un procedimiento de investigación.

### 39.1. Consultar el mensaje capturado

```bash
jq '.Messages[0] |
  {MessageId, Body, Attributes}' resultados/dlq-receive.json
```

### 39.2. Contrato

Valida el JSON y sus campos de negocio.

### 39.3. Evidencia externa

Consulta logs del consumidor y sus dependencias.

### 39.4. Límite

El cuerpo y los atributos de SQS no incluyen automáticamente una traza del error de tu aplicación.

### 39.5. Seguridad

No elimines el mensaje antes de decidir cómo conservar la evidencia necesaria.

---

## 40. Recuperación manual de un mensaje

Una recuperación controlada puede publicar una copia corregida en la principal.

### 40.1. Preparar contenido

```bash
jq -r '.Messages[0].Body' resultados/dlq-receive.json \
  | jq '.simulate_failure = false | .recovered = true' \
  > mensajes/recuperado.json
```

### 40.2. Publicación

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  sqs send-message --queue-url "$MAIN_URL" \
  --message-body file://mensajes/recuperado.json \
  > resultados/send-recovered.json
```

### 40.3. Advertencia

Esta publicación y la eliminación en DLQ son operaciones separadas.

No forman una transacción atómica.

---

## 41. Completar la recuperación

Elimina de la DLQ únicamente después de confirmar la publicación.

### 41.1. Handle de DLQ

```bash
DLQ_RECEIPT="$(jq -er '.Messages[0].ReceiptHandle' resultados/dlq-receive.json)"
```

### 41.2. Eliminación

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  sqs delete-message \
  --queue-url "$DLQ_URL" \
  --receipt-handle "$DLQ_RECEIPT"
```

### 41.3. Tiempo de trabajo

Si venció la visibilidad, recibe nuevamente y verifica el evento antes de eliminar.

### 41.4. Riesgo

Si se publicó la copia pero no se eliminó el original, una recuperación posterior puede duplicarlo.

---

## 42. Procesar el mensaje recuperado e idempotencia

La recuperación no elimina la necesidad de tolerar duplicados.

### 42.1. Práctica

Recibe el mensaje corregido desde la principal.

Comprueba `simulate_failure = false`.

Simula procesamiento correcto y elimínalo.

### 42.2. Identidad de negocio

Conserva un `event_id` estable para reconocer el evento.

### 42.3. Idempotencia

El consumidor debe evitar repetir efectos incompatibles si procesa el evento más de una vez.

### 42.4. Ejemplo

No debe cobrar dos veces un pedido por recibir dos copias del mismo evento.

### 42.5. Límite

SQS no implementa por sí solo la transacción de tu base de datos.

---

## 43. Redrive nativo y diferencias de retención

La recuperación nativa requiere revisar compatibilidad y permisos.

### 43.1. Operación opcional

SQS dispone de operaciones como `start-message-move-task`.

Pueden trasladar mensajes desde una DLQ compatible hacia una cola de destino.

No forman parte de la práctica obligatoria porque su soporte debe comprobarse en LocalStack.

### 43.2. Permisos

En AWS real debes revisar permisos sobre origen, destino y cifrado.

### 43.3. Retención en colas estándar

El tiempo de expiración sigue relacionado con el timestamp original de envío.

### 43.4. Retención en FIFO

Al trasladarse a una DLQ FIFO, el timestamp de envío se reinicia.

### 43.5. Métrica

La edad mostrada en DLQ no debe confundirse automáticamente con toda la antigüedad del evento.

---

## 44. Métricas, atributos y purgado

Las métricas ayudan a observar, pero no sustituyen pruebas de procesamiento.

### 44.1. Atributos útiles

Consulta:

- `ApproximateNumberOfMessages`.
- `ApproximateNumberOfMessagesNotVisible`.
- `ApproximateNumberOfMessagesDelayed`.

### 44.2. Aproximación

Estos contadores no constituyen una enumeración exacta e instantánea de todos los mensajes.

### 44.3. Purgado

`purge-queue` elimina mensajes de una cola, incluidos mensajes en vuelo.

En AWS real puede tardar hasta sesenta segundos y tiene restricciones entre solicitudes.

### 44.4. Advertencia

No utilices purgado para confirmar el procesamiento correcto.

Es una operación destructiva sobre datos.

---

## 45. Limpieza, diagnóstico y diferencias respecto a AWS real

Mantén LocalStack activo durante la destrucción.

### 45.1. Plan y aplicación

```bash
terraform plan -destroy -out=planes/destroy.tfplan
terraform show planes/destroy.tfplan
terraform apply planes/destroy.tfplan
terraform state list
aws --endpoint-url=http://localhost:4566 --region us-east-1 sqs list-queues
docker compose down
```

### 45.2. Diagnóstico

Revisa endpoint, URL de cola, políticas, handles y visibilidad antes de repetir comandos.

### 45.3. AWS real

Debes considerar costes, IAM, cifrado, cuotas y observabilidad.

Las políticas pueden tardar en propagarse.

LocalStack no reproduce necesariamente todos los tiempos, errores ni garantías operativas.

---

## 46. Ejercicios y resumen

Consolida la relación entre recepción, procesamiento y recuperación.

### 46.1. Ejercicios

1. Añade atributos de mensaje a un evento ficticio.
2. Observa dos recepciones sin eliminar el mensaje.
3. Cambia la visibilidad de una recepción actual.
4. Envía un mensaje fallido a la DLQ mediante reintentos.
5. Corrige su contenido y recupéralo de forma controlada.
6. Explica el riesgo de duplicación durante recuperación.
7. Documenta una estrategia de idempotencia.

### 46.2. Ideas esenciales

Recibir no elimina; eliminar confirma.

La DLQ aísla mensajes, pero no repara sus causas.

### 46.3. Idea final

Una cola bien configurada necesita consumidores que gestionen reintentos, duplicados y fallos con un procedimiento explícito y verificable.