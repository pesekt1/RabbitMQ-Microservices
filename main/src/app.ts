import * as express from "express";
import { Request, Response } from "express";
import * as cors from "cors";
import { createConnection } from "typeorm";
import * as amqp from "amqplib/callback_api";
import { Product } from "./entity/product";
import axios from "axios";

createConnection().then((db) => {
  const productRepository = db.getMongoRepository(Product);

  amqp.connect(process.env.RABBIT_MQ_URL, (error0, connection) => {
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

      app.use(
        cors({
          origin: [
            `http://localhost:${process.env.MAIN_FRONTEND_PORT}`,
            "http://localhost:8080",
            "http://localhost:4200",
          ],
        })
      );

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
          const product = await productRepository.findOne({
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

      app.get("/api/products", async (req: Request, res: Response) => {
        const products = await productRepository.find();
        return res.send(products);
      });

      app.post(
        "/api/products/:id/like",
        async (req: Request, res: Response) => {
          const product = await productRepository.findOne(req.params.id);
          await axios.post(
            `http://localhost:${process.env.ADMIN_PORT}/api/products/${product.admin_id}/like`,
            {}
          );
          product.likes++;
          await productRepository.save(product);
          return res.send(product);
        }
      );

      console.log("Listening to port: " + process.env.PORT);
      app.listen(process.env.PORT);
      process.on("beforeExit", () => {
        console.log("closing");
        connection.close();
      });
    });
  });
});
