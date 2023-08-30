import { compare, hash } from 'bcrypt';
import { ICreate, IUpdate } from '../interfaces/UsersInterface';
import { UsersRepository } from '../repositories/UsersRepository';
import { s3 } from '../config/aws';
import { v4 as uuid } from 'uuid';
import { sign, verify } from 'jsonwebtoken';

class UsersServices {
  private usersRepository: UsersRepository;

  constructor() {
    this.usersRepository = new UsersRepository();
  }
  async create({ name, email, password }: ICreate) {
    const findUser = await this.usersRepository.findUserByEmail(email);

    if (findUser) {
      throw new Error('User already exists');
    }

    const hashPassword = await hash(password, 10);

    const newUser = await this.usersRepository.create({
      name,
      email,
      password: hashPassword,
    });

    return newUser;
  }

  async index() {
    const result = await this.usersRepository.findAll();

    return result;
  }

  async update({
    name,
    oldPassword,
    newPassword,
    avatar_url,
    user_id,
  }: IUpdate) {
    if (oldPassword && newPassword) {
      const findUser = await this.usersRepository.findUserById(user_id);

      if (!findUser) {
        throw new Error('User not found');
      }

      const passwordMatch = await compare(oldPassword, findUser.password);
      if (!passwordMatch) {
        throw new Error('Invalid credentials');
      }
      const password = await hash(newPassword, 10);

      await this.usersRepository.updatePassword(password, user_id);
    }

    if (name) {
      const findUser = await this.usersRepository.findUserById(user_id);

      if (!findUser) {
        throw new Error('User not found');
      }
      if (name !== findUser.name) {
        await this.usersRepository.updateName(name, user_id);
      }
    }

    if (avatar_url) {
      const uploadImage = avatar_url?.buffer;
      const uploadS3 = await s3
        .upload({
          Bucket: 'agendamentos',
          Key: `${uuid()}-${avatar_url?.originalname}`,
          // ACL: 'public-read',
          Body: uploadImage,
        })
        .promise();

      //console.log('url da imagem => ', uploadS3.Location);

      await this.usersRepository.updateAvatar(uploadS3.Location, user_id);
    }

    return {
      message: 'User updated successfully',
    };
  }

  async delete(id: string) {
    const checkUserExists = await this.usersRepository.findUserById(id);

    if (!checkUserExists) {
      throw new Error('User not found');
    }
    if (checkUserExists.Schedule.length !== 0) {
      throw new Error('Cannot delete User that have Schedules');
    }

    const result = await this.usersRepository.delete(id);

    return result;
  }

  async auth(email: string, password: string) {
    const findUser = await this.usersRepository.findUserByEmail(email);
    if (!findUser) {
      throw new Error('Invalid credentials');
    }

    const passwordMatch = await compare(password, findUser.password);

    if (!passwordMatch) {
      throw new Error('Invalid credentials');
    }

    let secretKey: string | undefined = process.env.ACCESS_KEY_TOKEN;

    if (!secretKey) {
      throw new Error('No token key found');
    }

    let secretKeyRefreshToken: string | undefined =
      process.env.ACCESS_KEY_TOKEN_REFRESH;

    if (!secretKeyRefreshToken) {
      throw new Error('No token key found');
    }

    const token = sign({ email }, secretKey, {
      subject: findUser.id,
      expiresIn: 60 * 15,
    });

    const refreshToken = sign({ email }, secretKeyRefreshToken, {
      subject: findUser.id,
      expiresIn: '7d',
    });

    return {
      token,
      refresh_token: refreshToken,
      user: {
        name: findUser.name,
        email: findUser.email,
        avatar_url: findUser.avatar_url,
      },
    };
  }

  async refresh(refresh_token: string) {
    if (!refresh_token) {
      throw new Error('Refresh token missing');
    }

    let secretKey: string | undefined = process.env.ACCESS_KEY_TOKEN;

    if (!secretKey) {
      throw new Error('No token key found');
    }

    let secretKeyRefreshToken: string | undefined =
      process.env.ACCESS_KEY_TOKEN_REFRESH;

    if (!secretKeyRefreshToken) {
      throw new Error('No token key found');
    }

    const verifyRefreshToken = await verify(
      refresh_token,
      secretKeyRefreshToken
    );

    const { sub } = verifyRefreshToken;

    const newToken = sign({ sub }, secretKey, {
      expiresIn: 60 * 15,
    });
    const refreshToken = sign({ sub }, secretKeyRefreshToken, {
      expiresIn: '7d',
    });

    return { token: newToken, refresh_token: refreshToken };
  }
}

export { UsersServices };
