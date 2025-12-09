# Guía de Despliegue

Esta guía te ayudará a desplegar tu aplicación "Gestor de Préstamos" en Vercel.

## Prerrequisitos

Antes de comenzar, asegúrate de tener cuentas en los siguientes servicios:

1.  **[Vercel](https://vercel.com/)** - Para el alojamiento de la aplicación.
2.  **[Neon](https://neon.tech/)** - Para la base de datos PostgreSQL.
3.  **[Twilio](https://www.twilio.com/)** - Para el envío de SMS.
4.  **[Resend](https://resend.com/)** - Para el envío de correos electrónicos.

## 1. Configuración de la Base de Datos (Neon)

1.  Crea un nuevo proyecto en Neon.
2.  Copia la "Connection String" (te recomendamos la opción "Pooled" para evitar límites de conexión en Vercel).
3.  Esta será tu variable `DATABASE_URL`.

## 2. Preparación del Proyecto

El proyecto ya está configurado para Vercel. Hemos modificado `package.json` para incluir un script `postinstall` que generará el cliente de Prisma automáticamente.

Asegúrate de subir tus últimos cambios a tu repositorio (GitHub/GitLab/Bitbucket):

```bash
git add .
git commit -m "Preparar para despliegue"
git push
```

## 3. Despliegue en Vercel

1.  Inicia sesión en Vercel y haz clic en **"Add New..."** > **"Project"**.
2.  Importa tu repositorio git.
3.  En la configuración del proyecto ("Configure Project"):
    *   **Framework Preset:** Next.js (debería detectarse automáticamente).
    *   **Root Directory:** `./` (por defecto).

4.  **Environment Variables (Variables de Entorno):**
    Despliega la sección y agrega las siguientes variables. ¡Son obligatorias para que funcione la app!

    | Nombre | Descripción | Ejemplo / Fuente |
    | :--- | :--- | :--- |
    | `DATABASE_URL` | Conexión a Neon DB | `postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require` |
    | `TWILIO_ACCOUNT_SID` | SID de tu cuenta Twilio | Consola de Twilio |
    | `TWILIO_AUTH_TOKEN` | Token de autenticación | Consola de Twilio |
    | `TWILIO_PHONE_NUMBER` | Número comprado en Twilio | `+1234567890` |
    | `RESEND_API_KEY` | API Key de Resend | Dashboard de Resend |

5.  Haz clic en **"Deploy"**.

## 4. Configuración Post-Despliegue

Una vez que el despliegue termine (verás confetti en la pantalla), necesitas inicializar tu base de datos en producción.

Vercel tiene una terminal integrada, pero la forma más segura es hacerlo desde tu máquina local conectándote a la base de datos de producción, O usando la pestaña "Storage" si integraste Neon vía marketplace, pero asumiremos conexión manual.

### Opción A: Inicializar desde tu PC (Recomendado)

En tu máquina local, cambia temporalmente la `DATABASE_URL` en tu archivo `.env` por la URL de producción (la de Neon), o ejecuta el comando pasando la variable:

**1. Enviar el esquema a la base de datos de producción:**

Windows (Powershell):
```powershell
$env:DATABASE_URL="tu_url_de_neon_aqui"; npx prisma db push
```

Mac/Linux:
```bash
DATABASE_URL="tu_url_de_neon_aqui" npx prisma db push
```

**2. (Opcional) Cargar datos de prueba (Seed):**

Esto creará el usuario administrador por defecto (`agile` / `12345`).

Windows (Powershell):
```powershell
$env:DATABASE_URL="tu_url_de_neon_aqui"; npm run prisma:seed
```

Mac/Linux:
```bash
DATABASE_URL="tu_url_de_neon_aqui" npm run prisma:seed
```

## Solución de Problemas Comunes

*   **Error 500 en Login:** Generalmente significa que la `DATABASE_URL` es incorrecta o la base de datos no tiene las tablas creadas (`prisma db push` no se ejecutó).
*   **Error al enviar SMS/Email:** Verifica las credenciales de Twilio/Resend en las variables de entorno de Vercel. Recuerda que si cambias una variable en Vercel, debes "Redeploy" (redesplegar) para que surta efecto.
