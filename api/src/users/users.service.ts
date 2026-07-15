import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { User } from './user.entity';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  catName: string;
  displayName: string;
}

/**
 * Owns all persistence for {@link User}. Nothing here knows about HTTP or
 * passwords in plaintext — hashing happens in AuthService before we reach
 * this layer (single responsibility).
 *
 * Write methods accept an optional {@link EntityManager} so a caller can run
 * them inside an existing transaction (e.g. create user + wallet atomically
 * during registration). When none is passed, the injected repository is used.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /** Resolve a repository bound to a transaction if a manager was supplied. */
  private repo(manager?: EntityManager): Repository<User> {
    return manager ? manager.getRepository(User) : this.usersRepository;
  }

  create(data: CreateUserData, manager?: EntityManager): Promise<User> {
    const repo = this.repo(manager);
    const user = repo.create(data);
    return repo.save(user);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  findByCatName(catName: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { catName } });
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }
}
