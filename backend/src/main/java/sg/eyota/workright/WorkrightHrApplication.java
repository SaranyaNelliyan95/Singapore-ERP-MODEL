package sg.eyota.workright;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class WorkrightHrApplication {

	public static void main(String[] args) {
		SpringApplication.run(WorkrightHrApplication.class, args);
	}

}
