import express, { NextFunction, Request, Response } from 'express';
import { UsersRoutes } from './routes/users.routes';
import { SchedulesRoutes } from './routes/schedules.routes';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Corrigir espaço nos parâmetros com %20

const usersRoutes = new UsersRoutes().getRoutes();
const schedulesRoutes = new SchedulesRoutes().getRoutes();

app.use('/users', usersRoutes);
app.use('/schedules', schedulesRoutes);

app.use(
  (err: Error, request: Request, response: Response, next: NextFunction) => {
    if (err instanceof Error) {
      return response.status(400).json({
        message: err.message,
      });
    }
    return response.status(500).json({
      message: 'Internal Server Error',
    });
  }
);

app.use('/', (req, res) => {
  res.send('Welcome to the Hero HairDresses Server API');
});

app.listen(port, () => console.log(`Server is running at port: ${port}`));
