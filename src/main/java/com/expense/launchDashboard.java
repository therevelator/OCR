package com.expense;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class launchDashboard {

    @GetMapping("/dashboard")
    public String dashboard() {
        return "dashboard";
    }
}