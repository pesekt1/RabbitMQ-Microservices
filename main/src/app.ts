import * as express from "express";
import { Request, Response } from "express";
import * as cors from "cors";
import * as amqp from "amqplib/callback_api";
import { Product } from "./entity/product";
import axios from "axios";
import { AppDataSource } from "./data-source";
import { DataSource } from "typeorm";
import { ObjectId } from "mongodb";

AppDataSource.initialize().then((db) => {
  connect(db);
});

function connect(db: DataSource) {
  const productRepository = db.getMongoRepository(Product);

  amqp.connect(process.env.RABBIT_MQ_URL, (error0, connection) => {
    if (error0) {
      //throw error0;
      console.error("Failed to connect, retrying...", error0);
      setTimeout(() => connect(db), 5000); // Retry every 5 seconds
    } else {
      connection.createChannel((error1, channel) => {
        if (error1) {
          throw error1;
        }

        //declaring queues for each event
        channel.assertQueue("product_created", { durable: false });
        channel.assertQueue("product_updated", { durable: false });
        channel.assertQueue("product_deleted", { durable: false });

        const app = express();

        app.use(
          cors({
            origin: "*",
          })
        );

        // app.use(
        //   cors({
        //     origin: [
        //       `http://localhost:${process.env.MAIN_FRONTEND_PORT}`,
        //       "http://localhost:8080",
        //       "http://localhost:4200",
        //       "http://localhost:31001",
        //     ],
        //   })
        // );

        app.use(express.json());

        //consuming messages from the queue
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
            console.log("product created");
          },
          { noAck: true }
        );

        channel.consume(
          "product_updated",
          async (msg) => {
            const eventProduct: Product = JSON.parse(msg.content.toString());
            const product = await productRepository.findOneBy({
              admin_id: parseInt(eventProduct.id),
            });
            productRepository.merge(product, {
              title: eventProduct.title,
              image: eventProduct.image,
              likes: eventProduct.likes,
            });
            await productRepository.save(product);
            console.log("product updated");
          },
          { noAck: true }
        );

        channel.consume("product_deleted", async (msg) => {
          const admin_id = parseInt(msg.content.toString());
          await productRepository.deleteOne({ admin_id });
          console.log("product deleted");
        });

        app.get("/", async (req: Request, res: Response) => {
          if (process.env.POD_NAME) {
            return res.send(
              `Hello from main service on kubernetes pod: ${process.env.POD_NAME}`
            );
          }

          return res.send("Hello from main service");
        });

        app.get("/api/products", async (req: Request, res: Response) => {
          //add try catch block for error handling
          try {
            const products = await productRepository.find();
            return res.send(products);
          } catch (error) {
            console.log(error);
          }
        });

        app.post(
          "/api/products/:id/like",
          async (req: Request, res: Response) => {
            const product = await productRepository.findOne({
              where: {
                _id: new ObjectId(req.params.id),
              },
            });
            if (!product) {
              return res.status(404).send({ error: "Product not found" });
            }

            product.likes++;
            await productRepository.save(product);

            try {
              await axios.post(
                `http://admin:${process.env.ADMIN_PORT}/api/products/like`,
                { admin_id: product.admin_id }
              );
            } catch (error) {
              console.log(
                "Error while sending like event to admin service",
                error
              );
            }
            return res.send(product);
          }
        );

        console.log("Test Test.Listening to port: " + process.env.PORT);
        app.listen(process.env.PORT);
        process.on("beforeExit", () => {
          console.log("closing");
          connection.close();
        });
      });
    }
  });
}
