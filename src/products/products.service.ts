import { Injectable, Logger } from '@nestjs/common';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common/exceptions';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger('ProductsService'); // logger de nest utilizado para debuggear y manejar errores, le indicamos un string con el contexto nombando la classe a la cual aplicaria.

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>, //de esta forma usaramos el repositorio para insertar datos por ejemplo //
  ) {}

  async create(createProductDto: CreateProductDto) {
    //usaremos el patron repositorio - lo cual ya nos provee nest y typeORM
    try {
      //Validacion - Forma:1 en el servicio - Forma 2: en product.entity clean code
      // if (!createProductDto.slug) {
      //   createProductDto.slug = createProductDto.title
      //     .toLowerCase()
      //     .replaceAll(' ', '_')
      //     .replaceAll("'", '');
      // } else {
      //   createProductDto.slug = createProductDto.slug
      //     .toLowerCase()
      //     .replaceAll(' ', '_')
      //     .replaceAll("'", '');
      // }

      //Escritura en base de datos
      const product = this.productRepository.create(createProductDto); //esta linea solo crea nuestra instancia del producto con sus propiedades y lo guarda en la variable pero no escribe en la base de datos.

      await this.productRepository.save(product); //con esta linea guardamos e impactamos en la base de datos el producto instaciado.

      return product;
    } catch (error) {
      this.handleDBExeptions(error);
    }
  }

  //TODO: paginar
  findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

    return this.productRepository.find({
      take: limit,
      skip: offset,
      //TODO: relaciones
    });
  }

  async findOne(id: string) {
    const product = await this.productRepository.findOneBy({ id });
    if (!product)
      throw new NotFoundException(`Product with id ${id} not found`);
    return product;
  }

  update(id: number, updateProductDto: UpdateProductDto) {
    return `This action updates a #${id} product`;
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);

    return `${product.title} deleted`;
  }

  private handleDBExeptions(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.detail); //aqui podriamos ir controlando todos los posibles errores con sus respectivos codigos.

    this.logger.error(error);
    console.log(error);
    throw new InternalServerErrorException(
      'Unexpected error, check server logs',
    );
  }
}
