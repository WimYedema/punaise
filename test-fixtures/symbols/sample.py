"""PUN-003 fixture: shapes that a symbol identity (name, kind, container chain) must handle."""

import functools
from dataclasses import dataclass
from typing import TYPE_CHECKING, overload

MAX_RETRIES = 3


def logged(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)

    return wrapper


def top_level(a: int) -> int:
    def nested_helper(x: int) -> int:
        def deeply_nested() -> int:
            return x

        return deeply_nested()

    inner_lambda = lambda y: y * 2  # noqa: E731
    return inner_lambda(nested_helper(a))


@logged
def decorated(a: int) -> int:
    return a


@overload
def parse(value: str) -> int: ...
@overload
def parse(value: int) -> str: ...
def parse(value):
    return int(value) if isinstance(value, str) else str(value)


@dataclass
class Simulation:
    """A queued simulation."""

    id: str
    retries: int = MAX_RETRIES

    class Config:
        timeout = 30

        def describe(self) -> str:
            return "config"

    def run(self, factor: float = 1.5) -> float:
        def local_step() -> float:
            return factor

        return local_step()

    async def run_async(self) -> float:
        return self.run()

    @property
    def label(self) -> str:
        return self.id

    @label.setter
    def label(self, value: str) -> None:
        self.id = value

    @staticmethod
    def create(id: str) -> "Simulation":
        return Simulation(id)

    @classmethod
    def from_config(cls) -> "Simulation":
        return cls("default")

    @logged
    def decorated_method(self) -> None:
        pass


class OtherService:
    # Same method name as Simulation.run: only the container tells them apart.
    def run(self) -> None:
        pass


if TYPE_CHECKING:

    def conditional() -> int: ...

else:

    def conditional() -> int:
        return 0
