# Users

## Responsabilidad

Proveer el usuario persistido que actúa como propietario de una finca. En esta etapa User se creará mediante el seed; no se prepara autenticación.

## Modelo Prisma

`User`: `id`, `fullName`, `email`, `passwordHash`, `role` y `createdAt`.

## Relaciones

Un User puede poseer varias Farms mediante `Farm.ownerId`.

## Archivos

El contrato legacy permanece en `types/userTypes.ts`. El seed real se implementará en `backend/prisma/seeds.ts`.

## Service API prevista

No se define un CRUD de usuarios en esta etapa.

## Endpoints previstos

Ninguno para esta preparación.

## Validación

Se definirá junto con autenticación, fuera del alcance actual.

## Estado actual

Soporte de relación y seed pendiente.

## Pendientes para persistencia real

Crear un User inicial antes de insertar Farms.

## Fuera de alcance

Login, registro, JWT, permisos, refresh tokens y CRUD completo.
