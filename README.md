# Microservices with RabbitMQ

## TODO
Optimize the Dockerfiles - use multi-stage builds.

Update system architecture with seeders.



## How to run the system
- Create a free RabbitMQ message queue here: https://www.cloudamqp.com/
- Use the RabbitMQ connection string in both admin and main microservice to connect to your cloud message queue.
- You can also run docker-compose up (using the docker-compose.yml file) or install RabbitMQ to run RabbitMQ locally. Then you can access the gui at http://localhost:15673/ and use the default username and password: guest/guest (the docker compose connection will be: amqp://guest:guest@localhost:5673)
- if you dont have local MongoDB server and MySQL server then you can run docker images.
- install dependencies in all 4 apps (admin, main, main-frontend, admin-frontend).
- add .env files for all 4 apps

admin:
```
RABBIT_MQ_URL=<rabbitmq_url>
PORT=8002
ADMIN_FRONTEND_PORT=3002
```

admin-frontend:
```
PORT=3002
REACT_APP_API_URL=http://localhost:8002/api
```

main:
```
RABBIT_MQ_URL=<rabbitmq_url>
PORT=8001
ADMIN_PORT=8002
MAIN_FRONTEND_PORT=3001
```

main-frontend:
```
PORT=3001
REACT_APP_API_URL=http://localhost:8001/api
```

- Run tsc compiler for both admin and main backend microservices (to generate JavaScript files)
- Open 4 terminals and start all 4 apps.
- Go to http://localhost:3001 - the main react-frontend page
- Go to http://localhost:3002 - the admin page for products


There are also seeders for MySQL and MongoDB databases. You can run them to populate the databases with some data.
mongo-seeder/.evn:
```bash
MONGO_URL=<your_mongo_url>
```

mysql-seeder/.evn:
```bash
MYSQL_DATABASE_URL=<your_mysql_url>
```

## System Architecture:

![System Architecture](architecture_v2.png)

- admin: node.js express server in TypeScript using MySQL database (using TypeORM).
- main: node.js express server in TypeScript using MongoDB database (using TypeORM).

- React clients talks with their microservices via REST API. 

Main server and admin server communicate via RabbitMQ but there is also an internal HTTP communication between them.

### React client
React clients:
- main client app: Showing the products and a like button for each product.
- admin client app: products page + forms for editing and creating new products. Admin can also delete products.

#### Main page:
HTTP communication with the main server microservice.

Showing all products + like button:
```tsx
const Main = () => {
    const [products, setProducts] = useState([] as Product[]);

    useEffect(() => {
        (
            async () => {
                const response = await fetch(`${process.env.REACT_APP_API_URL}/products`);

                const data = await response.json();

                setProducts(data);
            }
        )();
    }, []);

    const like = async (id: number) => {
        await fetch(`${process.env.REACT_APP_API_URL}/products/${id}/like`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'}
        });
```

### Admin product page: Admin can see, add, edit, and delete products.
HTTP communication with the admin server microservice.

Getting and deleting products from the admin microservice:
```tsx
const Products = () => {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        (
            async () => {
                const response = await fetch(`${process.env.REACT_APP_API_URL}/products`);

                const data = await response.json();

                setProducts(data);
            }
        )();
    }, []);

    const del = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            await fetch(`${process.env.REACT_APP_API_URL}/products/${id}`, {
                method: 'DELETE'
            });

            setProducts(products.filter((p: Product) => p.id !== id));
        }
    }
```

Adding a product:
```tsx
await fetch(`${process.env.REACT_APP_API_URL}/products`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
        title,
        image
    })
});
```

Editing a product:
```tsx
    await fetch(
      `${process.env.REACT_APP_API_URL}/products/${props.match.params.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          image,
        }),
```

### Admin server microservice
MySQL database with TypeORM.

Logging is enabled for the development - we can see all the sql queries.

Product entity:
```ts
import {Column, Entity, PrimaryGeneratedColumn} from "typeorm";

@Entity()
export class Product {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column()
    image: string;

    @Column({default: 0})
    likes: number;
}
```

Express server with RabbitMQ:
```ts
import { createConnection } from "typeorm";
import * as amqp from "amqplib/callback_api";

createConnection().then((db) => {
  const productRepository = db.getRepository(Product);

  amqp.connect(
    //TODO: fill your RabbitMQ url
    "<your_rabbitmq_url>",
    (error0, connection) => {
      if (error0) {
        throw error0;
      }

      connection.createChannel((error1, channel) => {
        if (error1) {
          throw error1;
        }

        const app = express();
        app.get("/api/products"...
        app.post("/api/products"...
        app.get("/api/products/:id"...
        app.put("/api/products/:id"...
        app.delete("/api/products/:id"...
        app.post("/api/products/:id/like"...

        app.listen(8000);
        process.on("beforeExit", () => {connection.close();
```

Using RabbitMQ for put, post, delete endpoints:
Create a product endpoint:
First admin creates saves a product in MySQL and then it sends a message to RabbitMQ.
```ts
        app.post("/api/products", async (req: Request, res: Response) => {
          const product = productRepository.create(req.body);
          const result = await productRepository.save(product);
          channel.sendToQueue(
            "product_created",
            Buffer.from(JSON.stringify(result))
          );
          return res.send(result);
        });
```

### Main server microservice

Similar to the admin server microservice:
- unfortunatelly, logging does not work for MongoDB in TypeORM
- product entity with TypeORM
- express server with RabbitMQ

Main server is consuming messages from RabbitMQ and updating the MongoDB database - create, update, delete.
```ts
import { createConnection } from "typeorm";
import * as amqp from "amqplib/callback_api";

createConnection().then((db) => {
  const productRepository = db.getMongoRepository(Product);

  amqp.connect(
    //TODO: fill your RabbitMQ url
    "<your_rabbitmq_url>",
    (error0, connection) => {
      if (error0) {
        throw error0;
      }

      connection.createChannel((error1, channel) => {
        if (error1) {
          throw error1;
        }

        //declaring queues for each event
        channel.assertQueue("product_created", { durable: false });
        channel.assertQueue("product_updated", { durable: false });
        channel.assertQueue("product_deleted", { durable: false });

        const app = express();

        //consuming messages from RabbitMQ
        channel.consume("product_created"...
        channel.consume("product_updated"...
        channel.consume("product_deleted"...

        app.get("/api/products"...
        app.post("/api/products/:id/like"...

        app.listen(8001);
        process.on("beforeExit", () => {connection.close();
```

Consuming messages from RabbitMQ - creating a product:
```ts
channel.consume(
  "product_created",
  async (msg) => {
    const eventProduct: Product = JSON.parse(msg.content.toString());
    const product = new Product();
    product.admin_id = parseInt(eventProduct.id);
    product.title = eventProduct.title;
    product.image = eventProduct.image;
    product.likes = eventProduct.likes;
    await productRepository.save(product);
  },
  { noAck: true }
);
```


Internal HTTP communication from main to admin server:
When like button is clicked, likes value is increased, database is updated, and it is also propagated to the admin microservice using HTTP POST request.
```ts
        app.post(
          "/api/products/:id/like",
          async (req: Request, res: Response) => {
            const product = await productRepository.findOne({
              where: {
                _id: new ObjectId(req.params.id),
              },
            });

            await axios.post(
              `http://admin:${process.env.ADMIN_PORT}/api/products/like`,
              { title: product.title }
            );
            product.likes++;
            await productRepository.save(product);
            return res.send(product);
          }
        );
```

## working with docker-compose
docker-compose.yml file is used to run all services at once. It also creates a network for all services to communicate with each other.

List of services:
- admin: node.js express server in TypeScript using MySQL database (using TypeORM).
- main: node.js express server in TypeScript using MongoDB database (using TypeORM).
- admin-frontend: React client for admin service.
- main-frontend: React client for main service.
- mysql-seeder: MySQL database seeder.
- mongo-seeder: MongoDB database seeder.
- rabbitmq: RabbitMQ message queue.
- mysql: MySQL database.
- mongo: MongoDB database.

rebuilding and running a single service withing docker-compose (new image is always build):
```bash
docker-compose build admin; docker-compose up -d --force-recreate admin
```

Rebuilding and running all services withing docker-compose (images are build only if dockerfiles are changed):
```bash
docker-compose up --build
```

Building and running all services withing docker-compose (images are build even if dockerfiles are not changed):
```bash
docker-compose build; docker-compose up
```

If you want to exchange some service, for example you change mongoDb version in docker-compose.yml file, then you need to pull the image and run the service - you need to force the recreation of the service if another version is already running:
```bash
docker-compose pull mongodb; docker-compose up -d --force-recreate mongodb
```

Get rid of unused and dangling images:
```bash
docker image prune -a -f
```

## Optimizing Dockerfiles
- use multi-stage builds

### React.js applications:
We can use 2 stages:
- build stage: install dependencies and build the app
- production stage: copy the build from the build stage and run the app using nginx

Nginx default port is 80, but we can change it to another port for example 3001 in the nginx.conf file and then we can expose it in the dockerfile:

```conf
server {
    listen 3001;
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html =404;
    }
}
```

### Node.js applications:
We can use 2 stages:
- build stage: use robust node image to install dependencies and build the app
- production stage: use lightweight node image (alpine) to copy the build from the build stage and run the app

