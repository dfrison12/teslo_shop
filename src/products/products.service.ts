import { Injectable, Logger } from '@nestjs/common';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common/exceptions';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { validate as isUUID } from 'uuid';
import { ProductImage, Product } from './entities';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger('ProductsService'); // logger de nest utilizado para debuggear y manejar errores, le indicamos un string con el contexto nombando la classe a la cual aplicaria.

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>, //de esta forma usaramos el repositorio para insertar datos por ejemplo //

    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,

    private readonly dataSource: DataSource,
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

      const { images = [], ...productDetails } = createProductDto; //Uso de  OPERADOR REST , solo desestructuro imagenes, y el resto los esparso con el operador.

      const product = this.productRepository.create({
        ...productDetails,
        images: images.map((image) =>
          this.productImageRepository.create({ url: image }),
        ),
      }); //esta linea solo crea nuestra instancia del producto con sus propiedades y lo guarda en la variable pero no escribe en la base de datos.

      await this.productRepository.save(product); //con esta linea guardamos e impactamos en la base de datos el producto instaciado.

      return { ...product, images };
    } catch (error) {
      this.handleDBExeptions(error);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

    const products = await this.productRepository.find({
      take: limit,
      skip: offset,
      relations: {
        images: true,
      },
    });

    return products.map(({ images, ...rest }) => ({
      ...rest,
      images: images.map((img) => img.url),
    }));
  }

  async findOne(term: string) {
    let product: Product;

    if (isUUID(term)) {
      product = await this.productRepository.findOneBy({ id: term });
    } else {
      const queryBuilder = this.productRepository.createQueryBuilder('prod');
      product = await queryBuilder
        .where('UPPER(title)=:title or slug =:slug', {
          title: term.toLocaleUpperCase(),
          slug: term.toLocaleLowerCase(),
        })
        .leftJoinAndSelect('prod.images', 'prodImages') //indicamos del prod (alias del product repository) las images con las relacionadas con la otra tabla con el alias 'prodImages
        .getOne();
    }

    if (!product)
      throw new NotFoundException(`Product with id ${term} not found`);
    return product; //no aplano el array de imagenes y regreso siempre el producto, funciona para el return pero no sirve porque no devuelve una instancia de la entidad y fallarian los otros metodos que usan el findOne
  }

  //utilizaremos este para el metodo get y retornar el elemento aplanado, metodo creado utilizando la desestructuracion y aplanar el array.
  async findOnePlain(term: string) {
    const { images = [], ...rest } = await this.findOne(term);
    return {
      ...rest,
      images: images.map((image) => image.url),
    };
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const { images, ...toUpdate } = updateProductDto; // lo desestructuramos del updateProductDto para trabajarlos a parte

    // primero buscaremos con el preload los productos por id y luego lo cargaremos todas las propiedades adicionales del updateProductDto, y lo guardamos en product, el preload no actualiza la base de datos
    const product = await this.productRepository.preload({
      id: id,
      ...toUpdate,
    });

    if (!product)
      throw new NotFoundException(`Product with id: ${id} not found`); // segundo: validacion que corta la ejecucion

    // Create query runner
    const queryRunner = this.dataSource.createQueryRunner(); //con el query runner definimos una serie de procediciemntos que se tienen que cumplir antes de ejecutar el commit a la base de datos, en este caso se deberan cumplir dos transacciones. Transacciones: serian una serie de query que imapactaran la base de datos.
    await queryRunner.connect();
    await queryRunner.startTransaction();

    // tercero: guardo en la base de datos
    try {
      if (images) {
        await queryRunner.manager.delete(ProductImage, { product: { id } });

        product.images = images.map((image) =>
          this.productImageRepository.create({ url: image }),
        );
      }

      await queryRunner.manager.save(product);
      await queryRunner.commitTransaction();
      await queryRunner.release();
      return this.findOnePlain(id);

      //await this.productRepository.save(product); lo comentamos ya que lo cambiamos por el queryRunner
    } catch (error) {
      await queryRunner.rollbackTransaction(); // creamos el queryrunner fuera del try y catch porque necesitamos usarlo aca y hacer rollback de la transaction en caso de que falle
      await queryRunner.release();
      this.handleDBExeptions(error);
    }
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);

    // Para borrar un producto, que tiene imagenes relacionadas podriamos usar una transaccion para luego borrar las imegenes y luego el producto, en caso de que falle el borrado de imagenes se hace un rollback. - Pero usaremos delete en cascada por ahora.

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

  async deleteAllProducts() {
    const query = this.productRepository.createQueryBuilder('product');

    try {
      return await query.delete().where({}).execute();
    } catch (error) {
      this.handleDBExeptions(error);
    }
  }
}
