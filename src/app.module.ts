import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT,
      database: process.env.DB_NAME,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      autoLoadEntities: true,
      synchronize: true, //Cuando creamos algun cambio en nuestras entidades (por ejemplo: borrar o agregar una columna) automaticamente las sincroniza. En produccion usualmente se hacen prosesos mediante migraciones y no se usa esta opcion. Un metodo seria crear un archivo cuando se detecte algun tipo de cambio.
    }),
  ],
})
export class AppModule {}
