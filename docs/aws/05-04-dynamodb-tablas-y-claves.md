# DynamoDB: tablas y claves con Terraform y LocalStack

Amazon DynamoDB almacena elementos identificados por claves y permite consultarlos mediante patrones de acceso definidos.

Terraform permite declarar las tablas, sus claves y sus índices.

LocalStack permite practicar estas operaciones mediante una emulación local de las API de AWS.

En esta lección construirás una tabla con clave primaria compuesta y un índice secundario global.

Después utilizarás AWS CLI para insertar, consultar, actualizar y eliminar elementos.

La práctica separa la gestión de infraestructura de las operaciones sobre datos.

También estudiarás por qué elegir correctamente las claves es más importante que comenzar escribiendo recursos.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.

---

## 1. Objetivos de aprendizaje

Esta lección combina modelado de datos, infraestructura declarativa y sesiones de terminal.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Crear una tabla DynamoDB con Terraform.
- Diferenciar clave de partición y clave de ordenación.
- Identificar elementos mediante una clave primaria compuesta.
- Declarar atributos de claves correctamente.
- Crear un índice secundario global.
- Insertar y recuperar elementos con AWS CLI.
- Diferenciar `GetItem`, `Query` y `Scan`.
- Utilizar escrituras condicionales.
- Interpretar resultados paginados.
- Destruir el laboratorio de forma controlada.

### 1.2. Resultado práctico

Construirás una tabla de pedidos con cabeceras, líneas y consultas por cliente.

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

- Creación y descripción de tablas.
- Creación de índices secundarios globales.
- Escritura y lectura de elementos.
- Consultas por clave.
- Consultas sobre índices.
- Escrituras condicionales.
- Actualizaciones mediante expresiones.
- Paginación.
- Eliminación de tablas.

### 3.2. Registro del entorno

Documenta Terraform, proveedor AWS, AWS CLI e imagen o digest de LocalStack.

### 3.3. Alcance

Las restricciones del curso no identifican necesariamente las versiones más recientes.

---

## 4. Qué es una tabla DynamoDB

Una tabla contiene elementos y define cómo identificar cada uno.

### 4.1. Elementos

Un elemento representa una entidad o un fragmento de información.

En esta práctica puede representar una cabecera de pedido o una línea.

### 4.2. Atributos

Los atributos contienen los datos del elemento.

Cada elemento puede incluir atributos no presentes en otros.

### 4.3. Esquema principal

La tabla exige una estructura de clave primaria.

No exige declarar previamente todas las propiedades de negocio.

### 4.4. Consecuencia

DynamoDB ofrece flexibilidad de atributos, pero no elimina la necesidad de diseñar claves.

---

## 5. Elementos, atributos y tipos

El vocabulario de DynamoDB no coincide completamente con el de una base relacional.

### 5.1. Comparación orientativa

| **Concepto DynamoDB** | **Responsabilidad** | **Ejemplo** |
|----------------------|---------------------|-------------|
| Tabla | Contenedor de elementos | Pedidos |
| Elemento | Unidad identificable | Cabecera de un pedido |
| Atributo | Dato dentro del elemento | Estado |
| Clave primaria | Identificar un elemento | `pk` y `sk` |
| Índice | Habilitar otra organización de consulta | Pedidos por cliente |

La comparación ayuda a orientarse, pero no implica equivalencia con SQL.

### 5.2. Modelado

DynamoDB no realiza automáticamente joins entre tablas.

### 5.3. Diseño

Los patrones de acceso condicionan cómo organizar los elementos.

---

## 6. Clave primaria simple

Una tabla puede identificar cada elemento mediante una sola clave.

### 6.1. Clave de partición

Por ejemplo:

```text
customer_id = CUSTOMER#001
```

### 6.2. Unicidad

En una tabla con clave primaria simple, ese valor identifica el elemento completo.

### 6.3. Ejemplo conceptual

Una tabla de perfiles podría utilizar `customer_id` como clave primaria.

### 6.4. Limitación de diseño

No puedes guardar varios elementos con el mismo valor de clave primaria simple.

Una nueva escritura sobre la misma clave afecta al mismo elemento.

---

## 7. Clave primaria compuesta

Una tabla también puede combinar dos atributos de clave.

### 7.1. Componentes

- Clave de partición.
- Clave de ordenación.

### 7.2. Ejemplo

```text
pk = ORDER#1001
sk = META
```

### 7.3. Unicidad

La combinación completa identifica el elemento.

### 7.4. Ventaja

Varios elementos pueden compartir la clave de partición si tienen claves de ordenación diferentes.

### 7.5. Laboratorio

Utilizaremos `pk` y `sk` como nombres de atributos de clave.

---

## 8. Clave de partición

La clave de partición agrupa elementos para determinados patrones de acceso.

### 8.1. Ejemplo del laboratorio

```text
ORDER#1001
```

Todos los elementos del pedido compartirán este valor.

### 8.2. Consulta

Una operación `Query` exige igualdad sobre la clave de partición correspondiente.

### 8.3. Distribución

En AWS real, el valor participa en la distribución interna del almacenamiento.

### 8.4. Precaución

Una clave con demasiada actividad concentrada puede generar problemas de distribución de carga.

### 8.5. LocalStack

La práctica local no reproduce completamente ese comportamiento operativo.

---

## 9. Clave de ordenación

La clave de ordenación organiza elementos dentro de una misma clave de partición.

### 9.1. Ejemplos

```text
META
LINE#001
LINE#002
```

### 9.2. Consulta

Puede utilizarse para seleccionar rangos o prefijos.

### 9.3. Orden

Las cadenas se ordenan según sus bytes UTF-8.

### 9.4. Consecuencia

`LINE#010` y `LINE#002` se ordenan correctamente si utilizas relleno numérico consistente.

### 9.5. Regla

Diseña el formato de la clave según las consultas que necesitas realizar.

---

## 10. Patrones de acceso antes de la infraestructura

Comienza identificando las consultas de la aplicación.

### 10.1. Patrones del laboratorio

| **Necesidad** | **Operación prevista** | **Clave utilizada** |
|---------------|------------------------|--------------------|
| Recuperar una cabecera | `GetItem` | Pedido y `META` |
| Recuperar todo un pedido | `Query` | Partición del pedido |
| Recuperar sus líneas | `Query` con prefijo | Pedido y `LINE#` |
| Listar pedidos de un cliente | `Query` sobre GSI | Cliente y fecha |

Estos patrones justifican la tabla y el índice.

### 10.2. Lo que evitaremos

No utilizaremos `Scan` como sustituto habitual de consultas por clave.

### 10.3. Idea principal

La estructura debe facilitar los accesos relevantes, no copiar tablas SQL sin revisión.

---

## 11. Modelo de datos del laboratorio

Guardaremos cabeceras y líneas dentro de la misma tabla.

### 11.1. Cabecera

```text
pk = ORDER#1001
sk = META
entity_type = ORDER
```

### 11.2. Línea

```text
pk = ORDER#1001
sk = LINE#001
entity_type = ORDER_LINE
```

### 11.3. Agrupación

La clave de partición permite consultar el conjunto del pedido.

### 11.4. Precaución

Este ejemplo enseña un patrón.

No demuestra que una sola tabla sea siempre la mejor solución.

---

## 12. Tipos de atributos

DynamoDB distingue tipos escalares, documentos y conjuntos.

### 12.1. Tipos relevantes

| **Etiqueta de API** | **Tipo** | **Ejemplo** |
|--------------------|----------|-------------|
| `S` | Cadena | `"PENDING"` |
| `N` | Número | `"12500"` |
| `BOOL` | Booleano | `false` |
| `M` | Mapa | Objeto estructurado |
| `L` | Lista | Secuencia de valores |

La API de bajo nivel utiliza envoltorios explícitos.

### 12.2. Claves

Los atributos de clave pueden utilizar cadenas, números o binarios.

### 12.3. Laboratorio

Todas las claves serán cadenas.

Los importes se almacenarán como números enteros de céntimos.

---

## 13. JSON de DynamoDB y JSON ordinario

AWS CLI utiliza la representación de atributos de la API.

### 13.1. JSON ordinario

```json
{
  "status": "PENDING",
  "total_cents": 12500
}
```

### 13.2. JSON de atributos

```json
{
  "status": {"S": "PENDING"},
  "total_cents": {"N": "12500"}
}
```

### 13.3. Números

El contenido de `N` se transmite como cadena decimal.

No significa que DynamoDB lo almacene como una cadena de negocio.

---

## 14. Atributos declarados en Terraform

La configuración de tabla no debe enumerar todas las propiedades de los elementos.

### 14.1. Qué declarar

Los bloques `attribute` describen atributos utilizados por claves de tabla o índices.

### 14.2. Qué no declarar

No añadas automáticamente:

- `status`.
- `total_cents`.
- `quantity`.
- `product_name`.

### 14.3. Motivo

Esos atributos no forman parte de las claves del laboratorio.

### 14.4. Error habitual

Confundir `attribute` con la definición completa de columnas de una tabla relacional.

---

## 15. Índices secundarios globales

Un GSI permite consultar mediante otra clave de partición y, opcionalmente, otra de ordenación.

### 15.1. Índice del laboratorio

```text
Nombre: by_customer
Partición: customer_id
Ordenación: created_at
```

### 15.2. Uso

Recuperar pedidos de un cliente por fecha.

### 15.3. Independencia

La clave del índice no tiene que coincidir con la clave primaria de la tabla.

### 15.4. Unicidad

El GSI no impone unicidad a su combinación de claves.

Varios elementos pueden compartir valores de clave del índice.

---

## 16. Índices dispersos

Un elemento participa en un GSI cuando contiene los atributos de clave necesarios con tipos válidos.

### 16.1. Cabeceras

Las cabeceras incluirán `customer_id` y `created_at`.

### 16.2. Líneas

Las líneas no incluirán esos atributos.

### 16.3. Resultado

El índice contendrá cabeceras, no líneas.

### 16.4. Ventaja

La consulta por cliente no necesita eliminar líneas mediante un filtro posterior.

### 16.5. Precaución

No confundas ausencia de atributos del índice con valores vacíos.

---

## 17. Proyección y consistencia del GSI

El índice contiene las claves y los atributos proyectados.

### 17.1. Proyección del laboratorio

Utilizaremos:

```text
ALL
```

### 17.2. Efecto

Todos los atributos del elemento se proyectan al índice.

### 17.3. Producción

Evalúa `KEYS_ONLY` o `INCLUDE` cuando reduzcan almacenamiento y lecturas innecesarias.

### 17.4. Consistencia

Las consultas a GSI son eventualmente consistentes.

No solicites `--consistent-read` sobre el GSI.

### 17.5. Práctica

Espera su actualización antes de interpretar una respuesta vacía.

---

## 18. Preparación del directorio

Trabaja en una carpeta independiente.

### 18.1. Crear estructura

```bash
mkdir -p terraform-dynamodb-localstack/items
mkdir -p terraform-dynamodb-localstack/consultas
mkdir -p terraform-dynamodb-localstack/planes
mkdir -p terraform-dynamodb-localstack/resultados
cd terraform-dynamodb-localstack
```

### 18.2. Archivos principales

```text
terraform-dynamodb-localstack/
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

Separa configuración, datos ficticios y artefactos operativos.

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

### 19.2. Qué versionar

Versiona configuración, archivos ficticios y `.terraform.lock.hcl`.

### 19.3. Precaución

No publiques estados ni resultados con información real de clientes.

---

## 20. LocalStack y Docker Compose

Utiliza una imagen validada por el docente.

### 20.1. Selección

Sustituye el marcador:

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 20.2. `compose.yaml`

```yaml
services:
  localstack:
    image: ${LOCALSTACK_IMAGE:?Define LOCALSTACK_IMAGE}
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: dynamodb
      AWS_DEFAULT_REGION: us-east-1
```

### 20.3. Arranque

Ejecuta `docker compose up -d` y comprueba el contenedor.

---

## 21. Credenciales ficticias y conectividad

Configura AWS CLI en la terminal actual.

### 21.1. Variables

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
```

### 21.2. Consulta inicial

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  dynamodb list-tables
```

### 21.3. Continuación

Espera una respuesta válida antes de desplegar Terraform.

---

## 22. Requisitos y proveedor

Crea los archivos de conexión.

### 22.1. `versions.tf`

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

### 22.2. `providers.tf`

```hcl
provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    dynamodb = "http://localhost:4566"
  }
}
```

---

## 23. Variable e identidad de la tabla

Crea los archivos de entrada.

### 23.1. `variables.tf`

```hcl
variable "suffix" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.suffix))
    error_message = "Usa entre 4 y 8 caracteres alfanuméricos."
  }
}
```

### 23.2. `terraform.tfvars`

```hcl
suffix = "alumno01"
```

### 23.3. Nombre previsto

La tabla se llamará `curso-dynamodb-orders-alumno01`.

---

## 24. Tabla y clave primaria

Crea `main.tf`.

### 24.1. Primera parte del recurso

```hcl
resource "aws_dynamodb_table" "orders" {
  name         = "curso-dynamodb-orders-${var.suffix}"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "pk"
  range_key = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }
```

### 24.2. Continuación

Completa este mismo bloque con la configuración de la sección siguiente.

---

## 25. Índice y etiquetas

Añade esta segunda parte antes de cerrar el recurso.

### 25.1. Configuración

```hcl
  attribute {
    name = "customer_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  global_secondary_index {
    name            = "by_customer"
    hash_key        = "customer_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  tags = {
    Laboratory = "LocalStack"
    ManagedBy  = "Terraform"
  }
}
```

---

## 26. Outputs y despliegue inicial

Crea `outputs.tf` y prepara el proyecto.

### 26.1. Resultados

```hcl
output "table_name" {
  value = aws_dynamodb_table.orders.name
}

output "table_arn" {
  value = aws_dynamodb_table.orders.arn
}
```

### 26.2. Secuencia

```bash
terraform init
terraform fmt -recursive
terraform validate
terraform plan -out=planes/create.tfplan
terraform show planes/create.tfplan
terraform apply planes/create.tfplan
```

---

## 27. Sesión 1: verificar tabla e índice

Duración orientativa: 15 minutos.

### 27.1. Nombre y descripción

```bash
TABLE="$(terraform output -raw table_name)"

aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  dynamodb describe-table --table-name "$TABLE" \
  > resultados/table.json
```

### 27.2. Lectura

```bash
jq '.Table | {
  TableName, TableStatus, KeySchema, AttributeDefinitions,
  GlobalSecondaryIndexes
}' resultados/table.json
```

### 27.3. Continuación

Comprueba que tabla e índice estén activos antes de insertar datos.

---

## 28. Sesión 2: preparar cabeceras

Crea dos elementos ficticios.

### 28.1. `items/order-1001.json`

```json
{
  "pk": {"S": "ORDER#1001"},
  "sk": {"S": "META"},
  "entity_type": {"S": "ORDER"},
  "customer_id": {"S": "CUSTOMER#001"},
  "created_at": {"S": "2026-01-10T10:00:00Z"},
  "status": {"S": "PENDING"},
  "total_cents": {"N": "12500"}
}
```

### 28.2. `items/order-1002.json`

Copia el archivo y cambia pedido a `ORDER#1002`, fecha a `2026-01-11T10:00:00Z` e importe a `"7900"`.

Mantén cliente y `sk` para habilitar la consulta posterior.

---

## 29. Sesión 3: preparar líneas

Las líneas comparten la partición del primer pedido.

### 29.1. `items/line-1001-001.json`

```json
{
  "pk": {"S": "ORDER#1001"},
  "sk": {"S": "LINE#001"},
  "entity_type": {"S": "ORDER_LINE"},
  "product_id": {"S": "PRODUCT#A"},
  "quantity": {"N": "2"},
  "unit_price_cents": {"N": "5000"}
}
```

### 29.2. Segunda línea

Crea `items/line-1001-002.json` con `LINE#002`, producto `PRODUCT#B`, cantidad uno y precio `"2500"`.

### 29.3. Índice disperso

No añadas `customer_id` ni `created_at` a las líneas.

---

## 30. Sesión 4: insertar datos

`PutItem` escribe un elemento completo.

### 30.1. Publicación

```bash
for item in \
  items/order-1001.json \
  items/order-1002.json \
  items/line-1001-001.json \
  items/line-1001-002.json
do
  aws --endpoint-url=http://localhost:4566 --region us-east-1 \
    dynamodb put-item \
    --table-name "$TABLE" \
    --item "file://${item}"
done
```

### 30.2. Advertencia

Una nueva escritura con la misma clave sustituye el elemento completo.

### 30.3. Consecuencia

Los atributos omitidos en esa escritura no se conservan automáticamente.

---

## 31. Sesión 5: recuperar una cabecera

`GetItem` necesita la clave primaria completa.

### 31.1. `consultas/order-1001-key.json`

```json
{
  "pk": {"S": "ORDER#1001"},
  "sk": {"S": "META"}
}
```

### 31.2. Consulta

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  dynamodb get-item \
  --table-name "$TABLE" \
  --key file://consultas/order-1001-key.json \
  --consistent-read \
  > resultados/order-1001.json
```

### 31.3. Lectura

Ejecuta `jq '.Item' resultados/order-1001.json`.

---

## 32. Sesión 6: consultar todo un pedido

`Query` permite recuperar varios elementos de una partición.

### 32.1. Valores

Crea `consultas/order-values.json`:

```json
{
  ":pk": {"S": "ORDER#1001"}
}
```

### 32.2. Consulta

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  dynamodb query --table-name "$TABLE" \
  --key-condition-expression "#pk = :pk" \
  --expression-attribute-names '{"#pk":"pk"}' \
  --expression-attribute-values file://consultas/order-values.json \
  --consistent-read > resultados/order-items.json
```

### 32.3. Resultado

Debes recuperar cabecera y dos líneas.

---

## 33. Sesión 7: consultar solamente líneas

La clave de ordenación permite seleccionar un prefijo.

### 33.1. Valores

Crea `consultas/line-values.json`:

```json
{
  ":pk": {"S": "ORDER#1001"},
  ":prefix": {"S": "LINE#"}
}
```

### 33.2. Consulta

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  dynamodb query --table-name "$TABLE" \
  --key-condition-expression "#pk = :pk AND begins_with(#sk, :prefix)" \
  --expression-attribute-names '{"#pk":"pk","#sk":"sk"}' \
  --expression-attribute-values file://consultas/line-values.json \
  --consistent-read > resultados/order-lines.json
```

### 33.3. Verificación

Comprueba que `META` no aparece en el resultado.

---

## 34. Sesión 8: consultar pedidos por cliente

El GSI proporciona otro patrón de acceso.

### 34.1. Valores

Crea `consultas/customer-values.json`:

```json
{
  ":customer": {"S": "CUSTOMER#001"}
}
```

### 34.2. Consulta

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  dynamodb query --table-name "$TABLE" \
  --index-name by_customer \
  --key-condition-expression "#customer = :customer" \
  --expression-attribute-names '{"#customer":"customer_id"}' \
  --expression-attribute-values file://consultas/customer-values.json \
  > resultados/customer-orders.json
```

### 34.3. Resultado

Deben aparecer las dos cabeceras, no las líneas.

---

## 35. Sesión 9: ordenar y consultar por fecha

El índice organiza resultados por su clave de ordenación.

### 35.1. Orden descendente

Añade `--no-scan-index-forward` a la consulta del cliente.

### 35.2. Rango temporal

Puedes añadir una condición sobre `created_at`:

```text
#customer = :customer AND #created BETWEEN :start AND :end
```

### 35.3. Alias

Asocia `#created` con `created_at` y proporciona ambos límites como atributos `S`.

### 35.4. Fechas

Utiliza formato UTC uniforme y anchura consistente.

### 35.5. Advertencia

Mezclar zonas, formatos o precisiones puede romper el orden temporal esperado.

---

## 36. `GetItem`, `Query` y `Scan`

Las operaciones tienen costes y requisitos distintos.

### 36.1. Comparación

| **Operación** | **Selección inicial** | **Uso adecuado** |
|---------------|-----------------------|-----------------|
| `GetItem` | Clave primaria exacta | Recuperar un elemento |
| `Query` | Igualdad de partición y condición opcional de ordenación | Recuperar un conjunto relacionado |
| `Scan` | Recorrer tabla o índice | Exploración controlada o tareas específicas |

Una tabla pequeña puede ocultar diferencias importantes de coste.

### 36.2. `Scan`

No es equivalente a una consulta indexada por cualquier atributo.

### 36.3. Regla

Si una consulta importante requiere scans frecuentes, revisa el diseño.

---

## 37. Filtros y proyecciones

Estas opciones no cambian cómo se seleccionan inicialmente los datos.

### 37.1. Filtro

`FilterExpression` se aplica después de evaluar los elementos de la operación.

### 37.2. Consecuencia

No evita automáticamente leer elementos que después se descartan.

### 37.3. Proyección

`ProjectionExpression` selecciona atributos devueltos.

### 37.4. Precaución

No supone por sí sola una reducción equivalente de capacidad de lectura.

### 37.5. Alias

Utiliza `ExpressionAttributeNames` para nombres reservados o que necesiten escape.

---

## 38. Sesión 10: crear sin sobrescribir

Una condición permite rechazar una escritura incompatible.

### 38.1. Intento sobre un pedido existente

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  dynamodb put-item \
  --table-name "$TABLE" \
  --item file://items/order-1001.json \
  --condition-expression "attribute_not_exists(#pk)" \
  --expression-attribute-names '{"#pk":"pk"}'
```

### 38.2. Resultado esperado

La operación debe fallar con una condición no satisfecha.

### 38.3. Alcance

La condición se evalúa sobre el elemento de la clave completa.

No impide que otra clave de ordenación comparta la misma partición.

---

## 39. Sesión 11: actualizar con condición

`UpdateItem` modifica atributos sin reemplazar necesariamente todo el elemento.

### 39.1. Valores

Crea `consultas/status-values.json`:

```json
{
  ":expected": {"S": "PENDING"},
  ":new": {"S": "PAID"}
}
```

### 39.2. Operación

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  dynamodb update-item --table-name "$TABLE" \
  --key file://consultas/order-1001-key.json \
  --update-expression "SET #status = :new" \
  --condition-expression "#status = :expected" \
  --expression-attribute-names '{"#status":"status"}' \
  --expression-attribute-values file://consultas/status-values.json \
  --return-values ALL_NEW > resultados/order-updated.json
```

---

## 40. Interpretar actualizaciones condicionales

La condición permite detectar cambios incompatibles.

### 40.1. Primera ejecución

Debe cambiar `PENDING` por `PAID`.

### 40.2. Segunda ejecución

La misma operación debe fallar porque el estado ya no coincide con `PENDING`.

### 40.3. Utilidad

Evita sobrescribir ciegamente un cambio concurrente.

### 40.4. Límite

No sustituye todas las reglas de negocio ni una transacción entre varios elementos.

### 40.5. Claves

No cambies `pk` o `sk` mediante `UpdateItem`.

Cambiar identidad requiere otro elemento y un procedimiento de migración.

---

## 41. Sesión 12: practicar paginación

Una respuesta puede contener una continuación aunque devuelva pocos elementos.

### 41.1. Primera página

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  dynamodb query --table-name "$TABLE" \
  --key-condition-expression "#pk = :pk" \
  --expression-attribute-names '{"#pk":"pk"}' \
  --expression-attribute-values file://consultas/order-values.json \
  --limit 1 --no-paginate > resultados/page-1.json
```

### 41.2. Continuación

```bash
jq -e '.LastEvaluatedKey' resultados/page-1.json \
  > resultados/start-key.json
```

### 41.3. Siguiente página

Repite la consulta añadiendo `--exclusive-start-key file://resultados/start-key.json`.

---

## 42. Límites de páginas y resultados

La aplicación debe continuar hasta que desaparezca `LastEvaluatedKey`.

### 42.1. `Limit`

Limita elementos evaluados, no necesariamente elementos devueltos después del filtro.

### 42.2. Página vacía

Puede existir una página sin resultados útiles y con clave de continuación.

### 42.3. Tamaño

`Query` y `Scan` pueden paginar por el límite de tamaño de respuesta evaluada.

### 42.4. AWS CLI

Distingue paginación del servicio y opciones de paginación de la herramienta.

### 42.5. Regla

No interpretes `Count` de una página como total definitivo del conjunto.

---

## 43. Sesión 13: eliminar un elemento concreto

`DeleteItem` utiliza la clave primaria completa.

### 43.1. Clave de la segunda línea

Crea `consultas/line-002-key.json`:

```json
{
  "pk": {"S": "ORDER#1001"},
  "sk": {"S": "LINE#002"}
}
```

### 43.2. Eliminación

```bash
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  dynamodb delete-item --table-name "$TABLE" \
  --key file://consultas/line-002-key.json \
  --return-values ALL_OLD > resultados/deleted-line.json
```

### 43.3. Verificación

Consulta de nuevo el pedido y confirma que las demás claves permanecen.

---

## 44. Capacidad, lotes y transacciones

El comportamiento local no sustituye un diseño operativo de producción.

### 44.1. Capacidad

`PAY_PER_REQUEST` evita configurar capacidad provisionada en esta práctica.

En AWS real sigue existiendo facturación, cuotas y posibilidad de throttling.

### 44.2. Lotes

`BatchWriteItem` permite agrupar escrituras y eliminaciones.

Puede devolver operaciones sin procesar que requieren reintentos.

### 44.3. Condiciones

Las escrituras por lote no equivalen a escrituras condicionales individuales.

### 44.4. Transacciones

Utiliza las API transaccionales cuando necesites atomicidad entre operaciones compatibles.

### 44.5. Límite

No presupongas que un bucle de AWS CLI es una transacción.

---

## 45. Terraform, cambios de claves y datos

Separa gestión de infraestructura y gestión del contenido de negocio.

### 45.1. Elementos

Esta práctica escribe datos mediante AWS CLI.

No declara cada pedido como recurso Terraform.

### 45.2. Recurso de elementos

El proveedor dispone de `aws_dynamodb_table_item`, útil en casos concretos y pequeños.

No es una estrategia general para gestionar datos de aplicación.

### 45.3. Cambios de esquema

Modificar claves primarias puede requerir reemplazar la tabla.

### 45.4. Seguridad

Revisa el plan antes de aplicar cualquier refactorización de claves o índices.

Un reemplazo de tabla puede destruir todos sus datos.

---

## 46. Limpieza del laboratorio

Mantén LocalStack disponible durante la destrucción.

### 46.1. Plan y aplicación

```bash
terraform plan -destroy -out=planes/destroy.tfplan
terraform show planes/destroy.tfplan
terraform apply planes/destroy.tfplan
```

### 46.2. Verificación

```bash
terraform state list
aws --endpoint-url=http://localhost:4566 --region us-east-1 \
  dynamodb list-tables
docker compose down
```

### 46.3. Advertencia

Eliminar la tabla elimina también los elementos e índices del laboratorio.

---

## 47. Diferencias respecto a AWS real y diagnóstico

La emulación permite practicar API, pero no demuestra rendimiento ni seguridad de producción.

### 47.1. Aspectos que debes revisar

Considera IAM, cifrado, costes, cuotas, distribución de carga y consistencia.

También revisa backups, recuperación a un punto en el tiempo, TTL y protección de eliminación.

### 47.2. Errores frecuentes

- Endpoint omitido.
- Clave primaria incompleta.
- Tipos de atributos incorrectos.
- JSON ordinario utilizado como JSON de atributos.
- Lectura consistente solicitada sobre un GSI.
- Condición fallida interpretada como indisponibilidad.
- Índice todavía no actualizado.

### 47.3. Regla

Diagnostica el contrato, la operación y el servicio antes de repetir escrituras.

---

## 48. Ejercicios y resumen

Consolida el modelo antes de ampliar la tabla.

### 48.1. Ejercicios

1. Añade otro pedido para un cliente diferente.
2. Añade tres líneas y consulta solamente sus prefijos.
3. Recupera una cabecera mediante clave completa.
4. Consulta pedidos por cliente y rango temporal.
5. Provoca una escritura condicional fallida.
6. Recorre todas las páginas de un pedido.
7. Explica por qué las líneas no aparecen en el GSI.
8. Destruye y verifica el laboratorio.

### 48.2. Ideas esenciales

Las claves definen identidad y patrones de acceso.

Los índices habilitan consultas adicionales, no joins automáticos.

### 48.3. Idea final

Una tabla DynamoDB bien diseñada comienza por las consultas que necesita resolver y termina con operaciones verificables sobre claves claramente definidas.