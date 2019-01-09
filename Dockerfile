FROM ubuntu

# Docker used for testing

RUN \
    apt-get update; \
    apt-get install -y \
    build-essential \
    vim \
    curl; \
    rm -rf /var/lib/apt/lists/*


RUN curl -sL https://deb.nodesource.com/setup_10.x |  bash -

RUN \
    apt-get update; \
    apt-get install -y \
    nodejs;

# expose ports which are being used in this project
EXPOSE 3001
EXPOSE 3000

RUN useradd -ms /bin/bash ubuntu
USER ubuntu
WORKDIR /home/ubuntu

CMD /bin/bash
