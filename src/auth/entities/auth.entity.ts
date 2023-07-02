//nota: la funcion de la entidad es relacionar de alguna manera las tablas de nuestra base de datos y nuestra aplicacion de nest.
// Por lo tanto esta entidad corresponde a una tabla de la base de datos.

import { Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  email: string;

  password: string;

  fullName: string;

  isActive: boolean;

  roles: string[];
}
