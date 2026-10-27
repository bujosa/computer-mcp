# Tu primera computadora local: desde la instalación hasta Teach

[English](../WALKTHROUGH.md) · [Documentación](../README.md) · [Referencia de comandos](../SETUP.md)

Esta guía conecta tu agente con una computadora Linux dedicada. Crearás un
archivo, comprobarás el resultado y enseñarás una tarea de navegador para
repetirla con otros datos. Empieza con ejemplos sin información privada.
Los nombres de botones se mantienen en inglés, como aparecen en la aplicación.

Ir a [instalación](#2-instala-y-comprueba-los-requisitos),
[primera PC](#3-crea-y-abre-tu-primera-pc), [conexión](#4-crea-una-conexión-privada-para-tu-agente),
[harness](#5-conecta-el-harness-local), [skill](#6-instala-la-skill-de-operación),
[primera tarea](#7-completa-y-verifica-la-primera-tarea),
[Teach](#8-enseña-una-tarea-y-úsala-con-datos-nuevos),
[uso diario](#9-uso-diario-y-varias-computadoras) o [problemas](#10-resuelve-problemas-sin-ampliar-permisos).

## 1. Qué se ejecuta en cada lugar

| Parte               | Dónde se ejecuta                                     | Para qué sirve                                                                 |
| ------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| CLI del propietario | Tu computadora anfitriona                            | Crear/arrancar PCs, emitir conexiones y abrir la consola                       |
| Escritorio Linux    | Contenedor y volumen propios de Docker               | Ver y controlar la misma computadora que utiliza el agente                     |
| Puente MCP          | Proceso Node local que inicia tu harness             | Hablar por stdio con tu agente usando una conexión concreta                    |
| Agente y skill      | Claude Code, Codex, Cursor u otro harness compatible | Aportar el modelo, cargar instrucciones y realizar las llamadas a herramientas |

La dirección HTTP de la consola es para tu navegador. **No es la dirección del
MCP.** No configures esa URL como servidor MCP remoto. Tu harness inicia
`node …/src/cli.js mcp --connection …` y se comunica con ese proceso por stdio,
según el [transporte oficial MCP](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports#stdio).
Usa directamente Node; `npm start` añade mensajes a stdout que rompen el protocolo.

No necesitas otra terminal ejecutando `mcp` manualmente: el harness administra
ese proceso. Tú arrancas el invitado con `start` y pruebas la conexión con
`check`; ninguno de esos comandos inicia una conversación con un modelo.

El CLI, el harness y el archivo privado de conexión deben estar en el **mismo
entorno local de ejecución**. Un harness en la nube no puede leer esos archivos.
No mezcles rutas o ejecutables de Windows con un harness que corre en WSL/Linux.
Este adaptador rechaza Docker remoto. Tu modelo puede enviar datos a su proveedor:
que el MCP sea local no convierte la inferencia en offline.

| Sistema anfitrión                      | Computadora del agente | Límite real                                                                              |
| -------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------- |
| macOS + Docker Desktop                 | Linux                  | Ruta local ARM64 probada; no ofrece un macOS aislado ni control del escritorio anfitrión |
| Windows + Docker Desktop en modo Linux | Linux                  | Compatible con el CLI; esta guía no representa una nueva prueba en Windows               |
| Linux + Docker Engine local            | Linux                  | Compatible con el CLI; aquí no se afirma una nueva prueba de anfitrión Linux             |

El contenedor tiene su espacio dedicado, pero no equivale a una VM reforzada.
No necesitas conceder permisos de Accesibilidad/Grabación de pantalla de macOS
ni exponer tu escritorio personal. Los invitados macOS/Windows, las VM y el
aprovisionamiento remoto quedan pendientes. [Arquitectura](../../arquitecture.md).

## 2. Instala y comprueba los requisitos

Necesitas Git, **Node 22.13 o posterior** y **Docker Engine 28+ con Compose v2**,
con motor Linux local. En macOS/Windows, instala y abre Docker Desktop; en
Windows selecciona contenedores Linux. Instala/inicia sesión en tu harness
siguiendo sus propias instrucciones.

En la terminal de esa computadora:

```sh
git clone https://github.com/bujosa/computer-mcp.git
cd computer-mcp
npm ci
node src/cli.js --version
```

Los comandos del propietario de esta guía se ejecutan desde este checkout.
No lo muevas ni lo borres después de configurar el harness sin regenerar sus
rutas absolutas. No hay un paquete npm publicado del servidor Sendtry;
`npm ci` instala sus dependencias desde el código fuente.
[Estado de distribución](../PUBLICATION.md#is-npm-required).

Comprueba explícitamente el motor local:

```sh
# macOS / Windows con Docker Desktop
node src/cli.js doctor --context desktop-linux
```

En Linux usa este comando en su lugar. Si tu contexto local tiene otro nombre,
utiliza ese nombre validado:

```sh
node src/cli.js doctor --context default
```

Debes obtener `result: ok`, o una advertencia que hayas revisado y resuelto
cuando corresponda. Si aparece `blocked`, corrige el requisito antes de seguir.
Doctor no crea una PC ni cambia el contexto global de Docker. Rechaza destinos
SSH/TCP aunque su alias parezca local. La primera imagen descarga Chromium y
dependencias Linux y necesita espacio; el modo offline del invitado no hace
que la instalación inicial funcione sin Internet.

## 3. Crea y abre tu primera PC

En macOS/Windows:

```sh
node src/cli.js init --name my-computer --context desktop-linux
node src/cli.js start --name my-computer --open
node src/cli.js status --name my-computer
node src/cli.js list
```

En Linux cambia solo el contexto de `init` por el de tu motor local, normalmente
`--context default`. Los demás comandos usan explícitamente el contexto guardado.

Resultado esperado: PC lista, identidad de computadora/workspace estable y
consola del propietario en loopback. La primera PC registrada queda como
predeterminada del CLI. El escritorio, perfil de navegador y archivos se guardan
en su volumen propio y sobreviven a paradas/reconstrucciones normales.
El proyecto de tu anfitrión no se monta dentro del invitado.

La red inicial es **aislada/offline**. Los ejercicios de esta guía funcionan
así. Para navegar por Internet o descargar dependencias, crea otra PC con
`--network internet` durante `init`. Esa opción también permite llegar a
servicios de la LAN/anfitrión accesibles desde Docker; no es un firewall de salida.
[Redes y capacidad](../SETUP.md).

Si no abrió el navegador o caducó el enlace de propietario:

```sh
node src/cli.js open --name my-computer
```

El enlace es de un solo uso y caduca en 30 segundos; no lo compartas.
En **Screen**, pulsa **Take control** para usar el invitado y **Release** antes
de dar trabajo al agente. Tomar el control durante una ejecución interrumpe
ese intento: revisa los efectos parciales antes de asignar otro.

## 4. Crea una conexión privada para tu agente

Con la PC encendida, crea una conexión de trabajo con nombre propio:

```sh
node src/cli.js connection create my-agent --name my-computer --access work
```

El comando imprime una configuración JSON sin credenciales e indica por
separado la **ruta absoluta del archivo privado de conexión**. Conserva ese
archivo donde se creó. Su contenido incluye el secreto: no lo pegues en
configuraciones, conversaciones, GitHub ni skills. La configuración impresa
solo incluye rutas y una clave de servidor única; también debe quedarse local.

En los siguientes comandos sustituye `ABSOLUTE_PRIVATE_FILE` por la ruta que
recibiste, manteniendo las comillas. No uses el `computer.json` del propietario.

```sh
node src/cli.js check --connection "ABSOLUTE_PRIVATE_FILE"
```

Debes obtener `result: ready`. El estado de trabajo `needs-assignment` es normal
en este punto. La comprobación habla con el puente MCP real para observarlo;
no toma control ni inicia tareas. `busy` puede indicar una conexión válida con
otro controlador activo: revísalo antes de ejecutar. Un check correcto no
configura el harness ni demuestra que su modelo completará cualquier tarea.

Para un observador crea otro nombre con `--access read`: no podrá ejecutar
tareas ni analizar/proponer evidencia Teach. No edites el archivo para elevar
permisos o cambiar de PC. [Contrato de conexiones](../ASSIGNMENTS.md).

## 5. Conecta el harness local

Abre el **proyecto de tu agente**, que puede estar en otra carpeta. Combina la
entrada generada con su configuración existente; conserva los otros servidores
y la clave única `computer-…`. No reemplaces toda la configuración ni publiques
estas rutas locales en Git. Aprueba únicamente el proyecto/servidor deseado y
reconecta su sesión MCP.

### Claude Code

Usa el JSON de creación o vuelve a obtenerlo desde el checkout del servidor:

```sh
node src/cli.js config --connection "ABSOLUTE_PRIVATE_FILE" --client generic
```

Incorpora la entrada bajo `mcpServers` en `.mcp.json` del proyecto del agente.
Inicia Claude Code allí y revisa la aprobación del servidor. `claude mcp list`
muestra registros; comprueba además las herramientas reales dentro de la sesión.
[Configuración oficial de Claude Code](https://code.claude.com/docs/en/mcp).

### Codex

Genera TOML con la misma conexión, sin crear otra credencial:

```sh
node src/cli.js config --connection "ABSOLUTE_PRIVATE_FILE" --client codex
```

Incorpora la tabla `[mcp_servers.<clave-generada>]` en `.codex/config.toml` del
proyecto del agente. Codex carga configuración de proyectos de confianza.
También puedes utilizar deliberadamente tu configuración de usuario.
`codex mcp list` confirma el registro; reconecta y comprueba las herramientas.
[Configuración oficial de Codex](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).

### Cursor

Usa el JSON genérico en `.cursor/mcp.json` del proyecto. Dentro de la entrada de
este servidor, junto a `command` y `args`, añade `"type": "stdio"`, como indica
la [configuración actual de Cursor](https://cursor.com/docs/mcp). Activa/aprueba
ese servidor en los ajustes MCP y reconecta. Conserva el contenedor
`mcpServers`; `--client vscode` genera otro formato para VS Code.

### Verifica la conexión antes de ejecutar

Pide al agente:

> Inspecciona Sendtry Computer con computer_info. Indica los IDs de computadora
> y workspace, el acceso y el estado de control. No tomes el control ni cambies
> nada. Si hay varias PCs conectadas, pregunta cuál quiero utilizar.

Compara los IDs con la PC elegida en la consola/status. Actualmente una
conexión de trabajo con nombre expone 20 herramientas y una de lectura 9.
El harness puede añadirles un prefijo. El registro por sí solo o una afirmación
del agente sin una respuesta real de herramienta no bastan.

## 6. Instala la skill de operación

La **skill genérica** explica identidad, herramientas, tareas, control y
recuperación. No concede acceso ni inicia un agente. Desde el proyecto del
agente elige solo tu harness: sustituye `codex` por `claude-code` o `cursor`
cuando corresponda.

```sh
DISABLE_TELEMETRY=1 npx --yes skills@1.7.4 add bujosa/computer-mcp --skill sendtry-computer --agent codex --copy
```

En PowerShell:

```powershell
$env:DISABLE_TELEMETRY='1'
npx --yes skills@1.7.4 add bujosa/computer-mcp --skill sendtry-computer --agent codex --copy
```

Este paquete es un **instalador de skills de terceros** con versión fijada,
no un servidor Sendtry publicado en npm. Sin `--global` instala en este proyecto.
En esa versión, Codex/Cursor usan `.agents/skills/sendtry-computer/` y Claude
Code `.claude/skills/sendtry-computer/`. Revisa el plan del instalador. Como
alternativa manual copia la carpeta completa `skills/sendtry-computer/` del
checkout, conservando `LICENSE.txt`.
[Detalles de instalación](../PUBLICATION.md#install-from-github).

Pide que cargue `sendtry-computer`: en Codex usa `$sendtry-computer`; en Claude
Code `/sendtry-computer`. Comprueba que lee las instrucciones y descubre las
herramientas MCP. Reinicia si la detección de skills no se ha actualizado.
[Detección oficial de skills en Codex](https://learn.chatgpt.com/docs/build-skills).
Instalar la skill y aprobar el MCP son pasos separados.

## 7. Completa y verifica la primera tarea

Usa una PC donde todavía no exista `welcome.txt`. Si existe, elige otro nombre
nuevo y cambia todas las referencias de este ejercicio. Todo sucede dentro del
invitado, sin Internet, instalaciones ni acceso al sistema de archivos anfitrión.

1. En la consola abre **Tasks → New task**. En **Send to** elige tu conexión
   de trabajo.
2. Usa el nombre `Crear archivo de bienvenida` y completa los campos:

   **What should the agent do?**

   > Crea un archivo UTF-8 nuevo llamado welcome.txt en la raíz del workspace.
   > Debe contener exactamente dos líneas: "Hello from Sendtry Computer." y
   > "This file was created inside the Linux guest." Termina cada línea con un
   > salto de línea. Lee el archivo después de escribirlo.

   **What does success look like?**

   > welcome.txt existe con esas dos líneas exactas; el agente lo lee y reporta
   > lo observado. Yo abriré el archivo para comprobarlo por separado.

   **Scope and limits**

   > Solo crear ese archivo nuevo. Si existe, detenerse sin sobrescribir.
   > No modificar otros archivos, usar red, instalar, actuar sobre el anfitrión
   > ni utilizar otras computadoras.

3. Pulsa **Assign task & copy request** y pega la solicitud en tu agente
   conectado. Guardar/copiar no lo inicia. Libera el control humano con
   **Release** antes de ejecutar.
4. El agente comprueba la identidad, lee la asignación y llama a `task_start`.
   Ese intento queda vinculado a su conexión/sesión y lease exclusivo. Escribe
   y lee el archivo, y termina con `task_finish` y un informe del resultado.
5. Abre **Files**, lee `welcome.txt` y compara las dos líneas. Revisa el informe
   y, en **Your check**, usa **Mark checked** solo si coincide. Si falla,
   **Mark rejected** y una nota explicando la diferencia.

Resultado esperado: el archivo real coincide, el informe del agente y tu
veredicto son distintos y el lease queda liberado. Que el agente diga "éxito"
no sustituye tu comprobación. El texto del alcance no se convierte en una regla
mecánica que impida cualquier comando: revisa los efectos, especialmente con
acceso a terminal/red.

Si se interrumpe, inspecciona lo que llegó a hacer. No repitas efectos a ciegas;
crea otra asignación y otro nombre de salida cuando corresponda. Una solicitud
tiene un intento. [Ciclo de tareas](../TASKS.md).

## 8. Enseña una tarea y úsala con datos nuevos

Usa el formulario local de práctica, disponible offline. El flujo es
demostración → propuesta del agente → revisión tuya → nueva tarea. No entrena
pesos de un modelo ni ejecuta automáticamente un agente interno.

1. En **Screen**, pulsa **Take control** y **Practice task**. En
   **Teach & skills → Teach a task**, usa el nombre `Guardar nota de proyecto`
   y el objetivo de guardar proyecto/próximo paso y verificar tras recargar.
   Activa el video opcional del invitado Linux si quieres análisis visual.
2. En el formulario del invitado escribe **Project name** `Garden plan`,
   **Next step** `Choose three plants for the balcony.` y pulsa **Save note**.
   Termina con **Finish demonstration** y revisa la traza/video guardados.
3. Para análisis de video, revisa los datos visibles, pulsa
   **Allow agent analysis**, luego **Copy analysis request** y pega la solicitud
   en tu agente de trabajo con capacidad de visión. Esto permite que **todas
   las conexiones de trabajo** obtengan fotogramas de ese workflow; tu proveedor
   puede recibir información visible. El WebM original queda solo para el
   propietario. Consentir/copiar no inicia el análisis. La traza omite valores
   escritos y contenido de comandos; las muestras de video pueden omitir pasos.
4. El agente lee/analiza la evidencia y llama a `workflow_propose` sobre el mismo
   workflow y su revisión actual. Debe indicar incertidumbres y proponer entradas
   como `project_name` y `next_step`, sin fijar los valores de la demostración.
   Analizar no debe volver a ejecutar la tarea demostrada.
5. Pulsa **Refresh saved skill / Review updated proposal**. Corrige el método,
   las descripciones de entradas y el resultado esperado: los dos valores de
   esa ejecución deben seguir visibles tras recargar. Pulsa **Confirm review**.
   Sin video, puedes revisar la traza y redactar tú el procedimiento.
6. En **Try with new inputs**, introduce `Launch checklist` y
   `Review the release notes.`. La opción inicial **Prepare a plan first**
   permite enviar y revisar un plan. Para ejecutar, elige
   **Do the reviewed task**, selecciona la conexión de trabajo y guarda/copia
   la asignación. Envíala al agente y libera el control humano.
7. Inspecciona tú la nota guardada y recarga la página de práctica: deben
   persistir los nuevos valores. Esta página guarda únicamente la última nota;
   el ejercicio autoriza reemplazar esa nota de práctica. Registra tu veredicto.

**Export SKILL.md** descarga el procedimiento revisado, vinculado a esta
computadora/workspace/workflow/revisión. Mantenlo privado hasta revisar los
datos de la tarea antes de compartirlo. Es distinto del operador genérico MIT.
Revisa y exporta otra vez cuando cambie el método. Exportar no instala la skill
ni prueba que una ejecución funcionó.
[Ejemplo Teach completo](../TEACH.md#worked-example-teach-a-project-note).

## 9. Uso diario y varias computadoras

Desde el checkout del servidor:

```sh
node src/cli.js list
node src/cli.js connection list --all
node src/cli.js start --name my-computer
node src/cli.js open --name my-computer
node src/cli.js check --connection "ABSOLUTE_PRIVATE_FILE"
node src/cli.js stop --name my-computer
```

Espera a que termine el trabajo activo antes de parar; `stop` conserva datos
pero interrumpe intentos activos. El harness inicia/reconecta su proceso stdio
por separado. Si la PC ya está lista, `start` reutiliza el invitado actual.
Después de actualizar deliberadamente un checkout limpio y ejecutar `npm ci`,
usa `start --name my-computer --rebuild` para cargar los cambios de runtime/UI.
Reconstruir interrumpe sesiones/leases: revisa el trabajo activo primero y
reconecta el harness después. [Recuperación](../RECOVERY.md).

Para otra computadora, usa otro nombre, arráncala y crea su conexión:

```sh
node src/cli.js init --name second-computer --context desktop-linux
node src/cli.js start --name second-computer --open
node src/cli.js connection create second-agent --name second-computer --access work
node src/cli.js use second-computer
```

En Linux sustituye el contexto local de `init`. Conserva la segunda clave de
servidor al añadir ambas al mismo harness. Cada PC tiene identidad, volumen,
perfil de navegador y conexiones separados. `use` solo cambia el valor
predeterminado de futuros comandos del propietario; **no cambia las conexiones
MCP existentes**. Varios agentes pueden observar una PC, pero solo un controlador
puede escribir a la vez. Distintas PCs pueden trabajar independientemente.

Usa conexiones distintas por agente para atribución/revocación. Revisa
**Computers**, las conexiones de **Connect agent** y **Activity** para saber quién
está conectado y qué intentos existen. Los IDs y tareas son confiables; las
etiquetas declaradas de cliente/modelo no autentican a una persona. Activity
guarda metadatos operativos acotados, no una grabación completa de comandos,
prompts o identidades humanas. [Límites de auditoría](../ACTIVITY.md).

## 10. Resuelve problemas sin ampliar permisos

| Síntoma                                                       | Siguiente paso                                                                                             |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| PC apagada / conexión no disponible                           | Ejecuta `status` y `doctor` para el nombre correcto; arranca con su contexto local guardado                |
| `needs-assignment`                                            | Guarda una tarea en **Tasks** para esa conexión de trabajo y envía su solicitud                            |
| Conexión de lectura                                           | Solo observar; el propietario crea otra de trabajo si desea ejecución                                      |
| El harness no tiene herramientas                              | Revisa proyecto, rutas exactas, confianza/aprobación; reconecta y ejecuta `check`                          |
| No carga la skill                                             | Revisa carpeta del proyecto y cargador real; reinicia detección; instalarla no configura MCP               |
| PC ocupada / control humano activo                            | Mira quién controla; libera tu control humano cuando corresponda; tomarlo interrumpe otro trabajo          |
| Intento interrumpido / resultado inválido / respuesta perdida | Inspecciona tarea y salida antes de actuar; no repitas efectos ni reanudes un intento terminado            |
| La consola pide acceso de propietario                         | Ejecuta `open --name my-computer` para obtener otro enlace de un solo uso                                  |
| No carga una web externa                                      | La PC aislada está offline por diseño; crea otra con Internet si lo necesitas deliberadamente              |
| No encuentra el proyecto anfitrión                            | Copia solo los datos necesarios en Files o créalos con herramientas; no hay montaje del proyecto anfitrión |

Por defecto el catálogo privado está en `~/.computer-mcp`; cada volumen propio
guarda los datos de su invitado. No borres catálogo/volúmenes como reparación
genérica. No publiques tokens, enlaces de propietario, volcados de entorno ni
tareas/videos privados en reportes.
[Recuperación detallada](../RECOVERY.md) y [seguridad](../../SECURITY.md).

El recorrido básico está verificado cuando el harness observa mediante
herramientas reales, el archivo asignado coincide con tu comprobación y se
libera el control. Teach requiere además una ejecución del método revisado con
datos nuevos y comprobar que la salida persiste. Aumenta el alcance después
de conseguir esos resultados. Las referencias oficiales de clientes se
comprobaron el 27 de octubre de 2026; sus menús/aprobaciones pueden cambiar.
