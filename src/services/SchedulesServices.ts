import { ICreate } from '../interfaces/SchedulesInterface';
import { getHours, isBefore, startOfHour } from 'date-fns';
import { SchedulesRepository } from '../repositories/SchedulesRepository';

class SchedulesServices {
  private schedulesRepository: SchedulesRepository;

  constructor() {
    this.schedulesRepository = new SchedulesRepository();
  }

  async create({ name, phone, date, user_id }: ICreate) {
    const dateFormatted = new Date(date);
    const hourStart = startOfHour(dateFormatted);

    const hour = getHours(hourStart);

    if (hour <= 8 || hour >= 20) {
      throw new Error('Agendamentos disponíveis apenas entre 8h e 20h');
    }

    if (isBefore(hourStart, new Date())) {
      throw new Error('Não é permitido agendar em datas passadas!');
    }

    const checkIsAvailable = await this.schedulesRepository.find(
      hourStart,
      user_id
    );

    if (checkIsAvailable) {
      throw new Error('Horário indisponível para agendamento!');
    }

    const createSchedule = await this.schedulesRepository.create({
      name,
      phone,
      date: hourStart,
      user_id,
    });

    return createSchedule;
  }

  async index(date: Date) {
    const result = await this.schedulesRepository.findAll(date);

    return result;
  }

  async update(id: string, date: any, user_id: string) {
    const dateFormatted = new Date(date);
    const hourStart = startOfHour(dateFormatted);

    if (isBefore(hourStart, new Date())) {
      throw new Error('Não é permitido agendar em datas passadas!');
    }

    const checkIsAvailable = await this.schedulesRepository.find(
      hourStart,
      user_id
    );

    if (checkIsAvailable) {
      throw new Error('Horário indisponível para agendamento!');
    }

    const result = await this.schedulesRepository.update(id, date);

    return result;
  }
  async delete(id: string, user_id: string) {
    const checkScheduleExists = await this.schedulesRepository.findById(
      id,
      user_id
    );

    if (!checkScheduleExists) {
      throw new Error('Este agendamento não existe');
    }

    const result = await this.schedulesRepository.delete(id);

    return result;
  }
}

export { SchedulesServices };
