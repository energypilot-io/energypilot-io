import { cpus } from 'os'

/**
 * A lock that is granted when calling [[Semaphore.acquire]].
 */
type Lock = {
    release: () => void
}

/**
 * A task that has been scheduled with a [[Semaphore]] but not yet started.
 */
type WaitingPromise = {
    resolve: (lock: Lock) => void
    reject: (err?: Error) => void
}

/**
 * A [[Semaphore]] is a tool that is used to control concurrent access to a common resource. This implementation
 * is used to apply a max-parallelism threshold.
 */
export class Semaphore {
    private running = 0
    private waiting: WaitingPromise[] = []
    private debugLogging = false

    constructor(private label: string, public max: number = cpus().length) {
        if (max < 1) {
            throw new Error(
                `The ${label} semaphore was created with a max value of ${max} but the max value cannot be less than 1`
            )
        }
    }

    /**
     * Allows the next task to start, if there are any waiting.
     */
    private take = () => {
        if (this.waiting.length > 0 && this.running < this.max) {
            this.running++

            // Get the next task from the queue
            const task = this.waiting.shift()

            // Resolve the promise to allow it to start, provide a release function
            task!.resolve({ release: this.release })
        }
    }

    /**
     * Acquire a lock on the target resource.
     *
     * ! Returns a function to release the lock, it is critical that this function is called when the task is finished with the resource.
     */
    acquire = (): Promise<Lock> => {
        if (this.debugLogging) {
            console.log(
                `Lock requested for the ${this.label} resource - ${this.running} active, ${this.waiting.length} waiting`
            )
        }

        if (this.running < this.max) {
            this.running++
            return Promise.resolve({ release: this.release })
        }

        if (this.debugLogging) {
            console.log(
                `Max active locks hit for the ${this.label} resource - there are ${this.running} tasks running and ${this.waiting.length} waiting.`
            )
        }

        return new Promise<Lock>((resolve, reject) => {
            this.waiting.push({ resolve, reject })
        })
    }

    /**
     * Releases a lock held by a task. This function is returned from the acquire function.
     */
    private release = () => {
        this.running--
        this.take()
    }

    /**
     * Purge all waiting tasks from the [[Semaphore]]
     */
    purge = () => {
        if (this.debugLogging) {
            console.info(
                `Purge requested on the ${this.label} semaphore, ${this.waiting.length} pending tasks will be cancelled.`
            )
        }

        this.waiting.forEach((task) => {
            task.reject(
                new Error(
                    'The semaphore was purged and as a result this task has been cancelled'
                )
            )
        })

        this.running = 0
        this.waiting = []
    }
}
