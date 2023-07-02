//nota: la funcion de la entidad es relacionar de alguna manera las tablas de nuestra base de datos y nuestra aplicacion de nest.
// Por lo tanto esta entidad corresponde a una tabla de la base de datos.

import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  @Column('text', {
    unique: true,
  })
  id: string;

  @Column('text')
  email: string;

  @Column('text')
  password: string;

  @Column('text')
  fullName: string;

  @Column('bool', { unique: true })
  isActive: boolean;

  @Column('text', { default: ['user'] })
  roles: string[];
}
